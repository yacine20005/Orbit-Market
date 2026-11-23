import asyncio
import json
import os
import sqlite3
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

import httpx

from backend import bungie_api, manifest_manager
from backend.manifest_decoder import ManifestDecoder
from backend.routers import xur as xur_router

try:
    from fastapi.testclient import TestClient
    from backend.main import app

    HAS_TESTCLIENT = True
except Exception:
    HAS_TESTCLIENT = False


def _to_signed_32(val: int) -> int:
    return val - 4294967296 if val > 2147483647 else val


def _create_synthetic_manifest_db(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    try:
        for tbl in ManifestDecoder.ALLOWED_TABLES:
            conn.execute(f"CREATE TABLE {tbl} (id INTEGER PRIMARY KEY, json TEXT)")

        # Xur vendor + unrelated vendor (Banshee)
        conn.execute(
            "INSERT INTO DestinyVendorDefinition VALUES (?, ?)",
            (
                _to_signed_32(2190858386),
                json.dumps({"displayProperties": {"name": "Xûr", "description": "Agent of the Nine"}}),
            ),
        )
        conn.execute(
            "INSERT INTO DestinyVendorDefinition VALUES (?, ?)",
            (
                _to_signed_32(672118013),
                json.dumps({"displayProperties": {"name": "Banshee-44", "description": "Gunsmith"}}),
            ),
        )

        # Stats
        conn.execute(
            "INSERT INTO DestinyStatDefinition VALUES (?, ?)",
            (
                _to_signed_32(4043523819),
                json.dumps({"displayProperties": {"name": "Impact", "description": "Damage", "icon": ""}}),
            ),
        )

        # Plugs / Perks: 2 exotic perks, 1 legendary trait, 1 empty socket (should be filtered)
        plugs = [
            (100, {"displayProperties": {"name": "Exotic Intrinsic", "description": "Main perk", "icon": "/p1.png"}, "inventory": {"tierType": 6}, "itemTypeDisplayName": "Intrinsic"}),
            (200, {"displayProperties": {"name": "Exotic Trait", "description": "Second perk", "icon": "/p2.png"}, "inventory": {"tierType": 6}, "itemTypeDisplayName": "Trait"}),
            (300, {"displayProperties": {"name": "Outlaw", "description": "Fast reload", "icon": "/p3.png"}, "inventory": {"tierType": 5}, "itemTypeDisplayName": "Trait"}),
            (400, {"displayProperties": {"name": "Empty Mod Socket", "description": "", "icon": ""}, "inventory": {"tierType": 2}, "itemTypeDisplayName": "Mod"}),
        ]
        for pid, pdef in plugs:
            conn.execute(
                "INSERT INTO DestinyInventoryItemDefinition VALUES (?, ?)",
                (_to_signed_32(pid), json.dumps(pdef)),
            )

        # Items
        items = [
            # The Xûrfboard (must NOT be dropped by nav filter!)
            (
                3158812152,
                {
                    "displayProperties": {"name": "The Xûrfboard", "description": "Skimmer", "icon": "/xurf.jpg"},
                    "inventory": {"tierType": 6},
                    "itemTypeDisplayName": "Exotic Vehicle",
                    "classType": 3,
                    "stats": {"stats": {"4043523819": {"value": 85, "maximum": 100}}},
                    "sockets": {
                        "socketEntries": [
                            {"singleInitialItemHash": 100},
                            {"singleInitialItemHash": 200},
                            {"singleInitialItemHash": 400},
                        ]
                    },
                },
            ),
            # Legendary weapon (must keep its legendary perks!)
            (
                882778888,
                {
                    "displayProperties": {"name": "Foundry Rifle", "description": "Legendary AR", "icon": "/ar.jpg"},
                    "inventory": {"tierType": 5},
                    "itemTypeDisplayName": "Auto Rifle",
                    "classType": 3,
                    "stats": {"stats": {"4043523819": {"value": 42, "maximum": 100}}},
                    "sockets": {"socketEntries": [{"singleInitialItemHash": 300}]},
                },
            ),
            # Same-name class items for Hunter (1) and Titan (0) — both must survive dedup!
            (
                900001,
                {
                    "displayProperties": {"name": "Strange Class Bond", "description": "Hunter", "icon": "/c1.jpg"},
                    "inventory": {"tierType": 6},
                    "classType": 1,
                },
            ),
            (
                900002,
                {
                    "displayProperties": {"name": "Strange Class Bond", "description": "Titan", "icon": "/c2.jpg"},
                    "inventory": {"tierType": 6},
                    "classType": 0,
                },
            ),
            # Real navigation link (must be skipped)
            (
                900003,
                {
                    "displayProperties": {"name": "More Strange Offers", "description": "Menu", "icon": ""},
                    "inventory": {"tierType": 0},
                    "classType": 3,
                },
            ),
        ]
        for iid, idef in items:
            conn.execute(
                "INSERT INTO DestinyInventoryItemDefinition VALUES (?, ?)",
                (_to_signed_32(iid), json.dumps(idef)),
            )

        conn.commit()
    finally:
        conn.close()


class TestManifestDecoder(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmpdir.name) / "manifest.sqlite"
        _create_synthetic_manifest_db(self.db_path)
        self.decoder = ManifestDecoder(db_path=str(self.db_path))

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_missing_db_and_none_hash_do_not_crash(self):
        missing = ManifestDecoder(db_path=str(Path(self.tmpdir.name) / "missing.sqlite"))
        self.assertFalse(missing.has_manifest())
        self.assertIsNone(missing.get_item_definition(3158812152))
        self.assertIsNone(self.decoder.get_item_definition(None))
        self.assertIsNone(self.decoder.get_item_definition("not-a-number"))
        with self.assertRaises(ValueError):
            self.decoder.get_definition("sqlite_master", 1)

    def test_decode_vendor_filters_target_preserves_perks_stats_and_xurfboard(self):
        payload = {
            "ErrorCode": 1,
            "ThrottleSeconds": 0,
            "Response": {
                "vendors": {
                    "data": {
                        "2190858386": {"vendorHash": 2190858386},
                        "672118013": {"vendorHash": 672118013},
                    }
                },
                "sales": {
                    "data": {
                        "2190858386": {
                            "saleItems": {
                                "0": {"vendorItemIndex": 0, "itemHash": 3158812152},
                                "1": {"vendorItemIndex": 1, "itemHash": 882778888},
                                "2": {"vendorItemIndex": 2, "itemHash": 900001},
                                "3": {"vendorItemIndex": 3, "itemHash": 900002},
                                "4": {"vendorItemIndex": 4, "itemHash": 900003},
                            }
                        },
                        "672118013": {
                            "saleItems": {
                                "0": {"vendorItemIndex": 0, "itemHash": 882778888},
                            }
                        },
                    }
                },
                "itemComponents": {
                    "2190858386": {
                        "instances": {"data": {"0": {"primaryStat": {"value": 2010}}}},
                        "stats": {"data": {"0": {"stats": {"4043523819": {"value": 92}}}}},
                    }
                },
            },
        }

        decoded = self.decoder.decode_vendor_data(payload, target_vendor_hash="2190858386")
        resp = decoded["Response"]

        # Only target vendor was decoded; Banshee was skipped
        self.assertEqual(resp["vendors"]["data"]["2190858386"]["name"], "Xûr")
        self.assertNotIn("name", resp["vendors"]["data"]["672118013"])
        self.assertNotIn("itemName", resp["sales"]["data"]["672118013"]["saleItems"]["0"])

        xur_sales = resp["sales"]["data"]["2190858386"]["saleItems"]
        # Nav link 'More Strange Offers' skipped; Xurfboard, Rifle, and both class items kept
        self.assertEqual(set(xur_sales.keys()), {"0", "1", "2", "3"})

        xurf = xur_sales["0"]
        self.assertEqual(xurf["itemName"], "The Xûrfboard")
        self.assertEqual(xurf["powerLevel"], 2010)
        # Instance stat (92) overrides base stat (85) and is included in output
        self.assertEqual(xurf["stats"][0]["name"], "Impact")
        self.assertEqual(xurf["stats"][0]["value"], 92)
        # Both exotic perks preserved; 'Empty Mod Socket' filtered out
        self.assertEqual([p["name"] for p in xurf["perks"]], ["Exotic Intrinsic", "Exotic Trait"])

        # Legendary weapon keeps its trait perk
        rifle = xur_sales["1"]
        self.assertEqual([p["name"] for p in rifle["perks"]], ["Outlaw"])


class TestManifestManager(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmpdir.name)

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_extract_manifest_zip_is_atomic_and_blocks_zip_slip(self):
        zip_path = self.tmp_path / "test.zip"
        dest_path = self.tmp_path / "manifest.sqlite"
        dest_path.write_bytes(b"old-db-bytes")

        with zipfile.ZipFile(zip_path, "w") as zf:
            # Malicious traversal name inside archive should never escape dest_path.parent
            zf.writestr("../../evil/world_sql_content.content", b"new-sqlite-content")

        manifest_manager._extract_manifest_zip(zip_path, dest_path)

        self.assertEqual(dest_path.read_bytes(), b"new-sqlite-content")
        self.assertFalse(zip_path.exists())
        self.assertFalse((self.tmp_path.parent / "evil").exists())

    def test_corrupt_zip_cleans_up_temp_file_and_raises(self):
        zip_path = self.tmp_path / "corrupt.zip"
        dest_path = self.tmp_path / "manifest.sqlite"
        zip_path.write_bytes(b"not-a-valid-zip")

        with self.assertRaises(zipfile.BadZipFile):
            manifest_manager._extract_manifest_zip(zip_path, dest_path)

        self.assertFalse(zip_path.exists())
        self.assertFalse(dest_path.exists())

    def test_update_manifest_raises_on_metadata_failure(self):
        with mock.patch.object(
            manifest_manager, "get_manifest_metadata", new=mock.AsyncMock(return_value=None)
        ):
            with self.assertRaises(manifest_manager.ManifestUpdateError):
                asyncio.run(manifest_manager.update_manifest_if_needed())

    def test_missing_api_key_raises_lazily_at_call_time(self):
        with mock.patch.dict(os.environ, {"BUNGIE_API_KEY": ""}, clear=False):
            with self.assertRaises(manifest_manager.ManifestUpdateError):
                asyncio.run(manifest_manager.get_manifest_metadata())
            self.assertIsNone(bungie_api.get_bungie_api_key())


@unittest.skipUnless(HAS_TESTCLIENT, "FastAPI TestClient not installed")
class TestApiRoutes(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmpdir.name)
        self.db_path = self.tmp_path / "manifest.sqlite"
        self.info_path = self.tmp_path / "manifest_info.json"
        self.client = TestClient(app)

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_root_health_and_cors(self):
        r_root = self.client.get("/")
        self.assertEqual(r_root.status_code, 200)
        self.assertEqual(r_root.json()["version"], "2.0.0")

        r_health = self.client.get("/health", headers={"Origin": "https://example.com"})
        self.assertEqual(r_health.status_code, 200)
        self.assertEqual(r_health.json()["status"], "healthy")
        self.assertNotEqual(
            r_health.headers.get("access-control-allow-credentials"), "true"
        )

    def test_xur_no_redirect_and_missing_manifest_no_500_or_path_leak(self):
        fake_bungie_response = {
            "ErrorCode": 1,
            "ThrottleSeconds": 0,
            "Response": {
                "vendors": {"data": {"2190858386": {"vendorHash": 2190858386}}},
                "sales": {
                    "data": {
                        "2190858386": {
                            "saleItems": {"0": {"vendorItemIndex": 0, "itemHash": 3158812152}}
                        }
                    }
                },
            },
        }
        missing_decoder = ManifestDecoder(db_path=str(self.tmp_path / "missing.sqlite"))

        with mock.patch.object(
            bungie_api, "make_bungie_request", new=mock.AsyncMock(return_value=fake_bungie_response)
        ), mock.patch.object(xur_router, "manifest_decoder", missing_decoder):
            r = self.client.get("/xur", follow_redirects=False)
            self.assertEqual(r.status_code, 200)
            body = r.json()
            self.assertEqual(body["ErrorCode"], 0)
            self.assertNotIn(str(self.tmp_path), json.dumps(body))

            # /xur/debug must also not crash 500 when manifest.sqlite is absent
            r_debug = self.client.get("/xur/debug")
            self.assertEqual(r_debug.status_code, 200)
            self.assertFalse(r_debug.json()["manifest_available"])

    def test_xur_502_when_bungie_fails(self):
        with mock.patch.object(
            bungie_api, "make_bungie_request", new=mock.AsyncMock(return_value=None)
        ):
            r = self.client.get("/xur")
            self.assertEqual(r.status_code, 502)

    def test_xur_decodes_items_end_to_end_with_manifest(self):
        _create_synthetic_manifest_db(self.db_path)
        decoder = ManifestDecoder(db_path=str(self.db_path))
        fake_bungie_response = {
            "ErrorCode": 1,
            "ThrottleSeconds": 0,
            "Response": {
                "vendors": {"data": {"2190858386": {"vendorHash": 2190858386}}},
                "sales": {
                    "data": {
                        "2190858386": {
                            "saleItems": {
                                "0": {"vendorItemIndex": 0, "itemHash": 3158812152},
                                "1": {"vendorItemIndex": 1, "itemHash": 882778888},
                            }
                        }
                    }
                },
            },
        }
        with mock.patch.object(
            bungie_api, "make_bungie_request", new=mock.AsyncMock(return_value=fake_bungie_response)
        ), mock.patch.object(xur_router, "manifest_decoder", decoder):
            r = self.client.get("/xur")
            self.assertEqual(r.status_code, 200)
            body = r.json()
            self.assertEqual(body["ErrorCode"], 0)
            sales = body["Response"]["sales"]["saleItems"]
            self.assertEqual(sales["0"]["itemName"], "The Xûrfboard")
            self.assertEqual(len(sales["0"]["perks"]), 2)
            self.assertEqual(sales["0"]["stats"][0]["name"], "Impact")
            self.assertEqual(sales["1"]["perks"][0]["name"], "Outlaw")

    def test_lifespan_startup_does_not_block_healthcheck(self):
        started = asyncio.Event()

        async def slow_manifest_update():
            started.set()
            await asyncio.sleep(30)
            return {"updated": False, "version_path": "/v1"}

        with mock.patch("backend.main.update_manifest_if_needed", new=slow_manifest_update):
            with TestClient(app) as client:
                r = client.get("/health")
                self.assertEqual(r.status_code, 200)
                self.assertEqual(r.json()["status"], "healthy")

    def test_manifest_status_info_and_admin_update_guard(self):
        _create_synthetic_manifest_db(self.db_path)
        self.info_path.write_text(
            json.dumps(
                {
                    "version_path": "/common/destiny2_content/sqlite/en/v1.content",
                    "last_update": "2026-11-22T12:00:00+00:00",
                }
            ),
            encoding="utf-8",
        )

        with mock.patch.object(manifest_manager, "MANIFEST_DB_FILE", self.db_path), mock.patch.object(
            manifest_manager, "MANIFEST_INFO_FILE", self.info_path
        ):
            # Status keeps ISO string last_update
            r_status = self.client.get("/manifest/status")
            self.assertEqual(r_status.status_code, 200)
            self.assertEqual(r_status.json()["last_update"], "2026-11-22T12:00:00+00:00")

            # Info omits raw filesystem path
            r_info = self.client.get("/manifest/info")
            self.assertEqual(r_info.status_code, 200)
            info_json = r_info.json()
            self.assertNotIn("file_path", info_json)
            self.assertNotIn(str(self.tmp_path), json.dumps(info_json))
            self.assertEqual(info_json["file_name"], "manifest.sqlite")

            # POST /manifest/update disabled (403) when MANIFEST_ADMIN_TOKEN unset
            with mock.patch.dict(os.environ, {"MANIFEST_ADMIN_TOKEN": ""}, clear=False):
                self.assertEqual(self.client.post("/manifest/update").status_code, 403)

            # POST /manifest/update rejects wrong token (401), accepts valid token (200), returns 502 on failure
            with mock.patch.dict(os.environ, {"MANIFEST_ADMIN_TOKEN": "secret-token"}, clear=False):
                self.assertEqual(
                    self.client.post(
                        "/manifest/update", headers={"X-Admin-Token": "wrong"}
                    ).status_code,
                    401,
                )

                with mock.patch.object(
                    manifest_manager,
                    "update_manifest_if_needed",
                    new=mock.AsyncMock(return_value={"updated": True, "version_path": "/v2.content"}),
                ):
                    r_ok = self.client.post(
                        "/manifest/update", headers={"X-Admin-Token": "secret-token"}
                    )
                    self.assertEqual(r_ok.status_code, 200)
                    self.assertTrue(r_ok.json()["updated"])

                with mock.patch.object(
                    manifest_manager,
                    "update_manifest_if_needed",
                    new=mock.AsyncMock(side_effect=manifest_manager.ManifestUpdateError("boom")),
                ):
                    r_fail = self.client.post(
                        "/manifest/update", headers={"Authorization": "Bearer secret-token"}
                    )
                    self.assertEqual(r_fail.status_code, 502)


if __name__ == "__main__":
    unittest.main()
