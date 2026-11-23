import contextlib
import json
import logging
import os
import sqlite3
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class ManifestDecoder:
    """Decodes Destiny 2 data from the local SQLite manifest."""

    CLASS_TITAN = 0
    CLASS_HUNTER = 1
    CLASS_WARLOCK = 2
    CLASS_ALL = 3

    RARITY_EXOTIC = 6

    ALLOWED_TABLES = {
        "DestinyInventoryItemDefinition",
        "DestinyStatDefinition",
        "DestinyDamageTypeDefinition",
        "DestinyVendorDefinition",
    }

    EXACT_NAVIGATION_LINKS = {
        "more strange offers",
        "strange gear offers",
        "more strange gear",
        "strange offers",
        "reset rank",
    }

    IGNORED_PLUG_MARKERS = (
        "empty",
        "default",
        "upgrade",
        "tracker",
        "socket",
        "tier ",
    )

    def __init__(self, db_path: Optional[str] = None):
        if db_path is not None:
            self.db_path = db_path
        else:
            current_dir = os.path.dirname(__file__)
            self.db_path = os.path.join(current_dir, "manifest", "manifest.sqlite")

    def has_manifest(self) -> bool:
        return os.path.exists(self.db_path)

    def connect_db(self) -> sqlite3.Connection:
        """Connects to the manifest database in read-only mode."""
        if not os.path.exists(self.db_path):
            raise FileNotFoundError("Manifest database is not available.")
        return sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True)

    @staticmethod
    def _to_sqlite_id(hash_id: Any) -> Optional[int]:
        if hash_id is None:
            return None
        try:
            numeric_id = int(hash_id)
        except (ValueError, TypeError):
            return None
        if numeric_id > 2147483647:
            numeric_id -= 4294967296
        return numeric_id

    def get_definition(
        self,
        table_name: str,
        hash_id: Any,
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Retrieve a single definition, reusing conn/cache when provided."""
        if table_name not in self.ALLOWED_TABLES:
            raise ValueError(f"Invalid manifest table name: {table_name}")

        sqlite_id = self._to_sqlite_id(hash_id)
        if sqlite_id is None:
            return None

        cache_key = (table_name, sqlite_id)
        if cache is not None and cache_key in cache:
            return cache[cache_key]

        try:
            if conn is not None:
                cursor = conn.cursor()
                cursor.execute(
                    f"SELECT json FROM {table_name} WHERE id = ?", (sqlite_id,)
                )
                row = cursor.fetchone()
            else:
                with contextlib.closing(self.connect_db()) as owned_conn:
                    cursor = owned_conn.cursor()
                    cursor.execute(
                        f"SELECT json FROM {table_name} WHERE id = ?", (sqlite_id,)
                    )
                    row = cursor.fetchone()

            parsed = json.loads(row[0]) if row else None
            if cache is not None:
                cache[cache_key] = parsed
            return parsed
        except FileNotFoundError:
            logger.warning("Manifest database not found when looking up %s", table_name)
            return None
        except (sqlite3.Error, json.JSONDecodeError, ValueError, TypeError) as exc:
            logger.error("Error retrieving definition %s/%s: %s", table_name, hash_id, exc)
            return None

    # === Definition Getters ===

    def get_item_definition(
        self,
        item_hash: Any,
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> Optional[Dict[str, Any]]:
        return self.get_definition("DestinyInventoryItemDefinition", item_hash, conn, cache)

    def get_stat_definition(
        self,
        stat_hash: Any,
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> Optional[Dict[str, Any]]:
        return self.get_definition("DestinyStatDefinition", stat_hash, conn, cache)

    def get_plug_definition(
        self,
        plug_hash: Any,
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> Optional[Dict[str, Any]]:
        return self.get_definition("DestinyInventoryItemDefinition", plug_hash, conn, cache)

    def get_damage_type_definition(
        self,
        damage_type_hash: Any,
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> Optional[Dict[str, Any]]:
        return self.get_definition("DestinyDamageTypeDefinition", damage_type_hash, conn, cache)

    # === Item Information Processing ===

    def get_item_detailed_info(
        self,
        item_hash: Any,
        item_instance_data: Optional[Dict] = None,
        sockets_data: Optional[Dict] = None,
        stats_data: Optional[Dict] = None,
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Retrieve detailed decoded info for a single Destiny 2 item."""
        if conn is None and self.has_manifest():
            with contextlib.closing(self.connect_db()) as owned_conn:
                return self.get_item_detailed_info(
                    item_hash,
                    item_instance_data=item_instance_data,
                    sockets_data=sockets_data,
                    stats_data=stats_data,
                    conn=owned_conn,
                    cache=cache if cache is not None else {},
                )

        item_def = self.get_item_definition(item_hash, conn=conn, cache=cache)
        if not item_def:
            return None

        detailed_info = self._create_base_item_info(item_hash, item_def)
        self._add_damage_type_info(item_def, detailed_info, conn=conn, cache=cache)
        self._add_base_stats(item_def, detailed_info, conn=conn, cache=cache)
        self._add_socket_info(item_def, sockets_data, detailed_info, conn=conn, cache=cache)
        self._add_instance_stats(stats_data, detailed_info, conn=conn, cache=cache)
        self._add_power_level(item_instance_data, detailed_info)

        return detailed_info

    def _create_base_item_info(
        self, item_hash: Any, item_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        tier_type = item_def.get("inventory", {}).get("tierType", 0)
        rarity = self.get_rarity_name(tier_type)
        return {
            "hash": item_hash,
            "displayProperties": item_def.get("displayProperties", {}),
            "itemType": item_def.get("itemType"),
            "itemSubType": item_def.get("itemSubType"),
            "itemTypeDisplayName": item_def.get("itemTypeDisplayName") or rarity,
            "classType": item_def.get("classType", self.CLASS_ALL),
            "rarity": rarity,
            "supportedClasses": self.get_supported_classes(item_def),
            "flavorText": item_def.get("flavorText", ""),
            "stats": {},
            "sockets": [],
            "perks": [],
            "damageType": None,
            "ammoType": item_def.get("equippingBlock", {}).get("ammoType", 0),
            "powerLevel": None,
        }

    def _add_damage_type_info(
        self,
        item_def: Dict[str, Any],
        detailed_info: Dict[str, Any],
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> None:
        damage_type_hash = item_def.get("defaultDamageTypeHash")
        if not damage_type_hash:
            return

        damage_type_def = self.get_damage_type_definition(
            damage_type_hash, conn=conn, cache=cache
        )
        if damage_type_def:
            detailed_info["damageType"] = {
                "hash": damage_type_hash,
                "name": damage_type_def.get("displayProperties", {}).get("name", ""),
                "icon": damage_type_def.get("displayProperties", {}).get("icon", ""),
                "color": damage_type_def.get("color", {}),
            }

    def _add_base_stats(
        self,
        item_def: Dict[str, Any],
        detailed_info: Dict[str, Any],
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> None:
        stats_data = item_def.get("stats", {}).get("stats", {})
        for stat_hash, stat_value in stats_data.items():
            value = stat_value.get("value", 0)
            if not value:
                continue
            stat_def = self.get_stat_definition(stat_hash, conn=conn, cache=cache)
            if stat_def:
                stat_name = stat_def.get("displayProperties", {}).get("name", "")
                if not stat_name:
                    continue
                detailed_info["stats"][str(stat_hash)] = {
                    "hash": int(stat_hash),
                    "name": stat_name,
                    "description": stat_def.get("displayProperties", {}).get("description", ""),
                    "icon": stat_def.get("displayProperties", {}).get("icon", ""),
                    "value": value,
                    "maximum": stat_value.get("maximum", 100),
                }

    def _add_socket_info(
        self,
        item_def: Dict[str, Any],
        sockets_data: Optional[Dict],
        detailed_info: Dict[str, Any],
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> None:
        if sockets_data and "sockets" in sockets_data:
            self._process_instance_sockets(sockets_data, detailed_info, conn=conn, cache=cache)
        elif "sockets" in item_def:
            self._process_default_sockets(item_def, detailed_info, conn=conn, cache=cache)

    def _add_instance_stats(
        self,
        stats_data: Optional[Dict],
        detailed_info: Dict[str, Any],
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> None:
        if not stats_data or "stats" not in stats_data:
            return

        for stat_hash, stat_value in stats_data["stats"].items():
            stat_def = self.get_stat_definition(stat_hash, conn=conn, cache=cache)
            if stat_def:
                stat_name = stat_def.get("displayProperties", {}).get("name", "")
                if not stat_name:
                    continue
                existing = detailed_info["stats"].get(str(stat_hash), {})
                detailed_info["stats"][str(stat_hash)] = {
                    "hash": int(stat_hash),
                    "name": stat_name,
                    "description": stat_def.get("displayProperties", {}).get("description", ""),
                    "icon": stat_def.get("displayProperties", {}).get("icon", ""),
                    "value": stat_value.get("value", 0),
                    "maximum": existing.get("maximum", 100),
                }

    def _add_power_level(
        self, item_instance_data: Optional[Dict], detailed_info: Dict[str, Any]
    ) -> None:
        if item_instance_data and "primaryStat" in item_instance_data:
            detailed_info["powerLevel"] = item_instance_data["primaryStat"].get("value", 0)

    # === Socket Processing ===

    def _process_instance_sockets(
        self,
        sockets_data: Dict[str, Any],
        detailed_info: Dict[str, Any],
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> None:
        for socket in sockets_data["sockets"]:
            plug_hash = socket.get("plugHash")
            if not plug_hash:
                continue
            plug_info = self._create_plug_info(plug_hash, conn=conn, cache=cache)
            if plug_info:
                plug_info["isEquipped"] = socket.get("isEnabled", False)
                detailed_info["sockets"].append(plug_info)
                detailed_info["perks"].append(plug_info)

    def _process_default_sockets(
        self,
        item_def: Dict[str, Any],
        detailed_info: Dict[str, Any],
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> None:
        socket_entries = item_def.get("sockets", {}).get("socketEntries", [])
        for socket_entry in socket_entries:
            default_plug_hash = socket_entry.get("singleInitialItemHash")
            if not default_plug_hash:
                continue
            plug_info = self._create_plug_info(default_plug_hash, conn=conn, cache=cache)
            if plug_info:
                plug_info["isEquipped"] = True
                plug_info["isDefault"] = True
                detailed_info["sockets"].append(plug_info)
                detailed_info["perks"].append(plug_info)

    def _create_plug_info(
        self,
        plug_hash: Any,
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> Optional[Dict[str, Any]]:
        plug_def = self.get_plug_definition(plug_hash, conn=conn, cache=cache)
        if not plug_def:
            return None

        plug_name = plug_def.get("displayProperties", {}).get("name", "").strip()
        if not plug_name:
            return None

        name_lower = plug_name.lower()
        if any(marker in name_lower for marker in self.IGNORED_PLUG_MARKERS):
            return None

        tier_type = plug_def.get("inventory", {}).get("tierType", 0)
        slot = plug_def.get("itemTypeDisplayName") or "Intrinsic"
        return {
            "hash": plug_hash,
            "name": plug_name,
            "slot": slot,
            "description": plug_def.get("displayProperties", {}).get("description", ""),
            "icon": plug_def.get("displayProperties", {}).get("icon", ""),
            "isExotic": tier_type == self.RARITY_EXOTIC or "intrinsic" in slot.lower(),
            "itemType": plug_def.get("itemType", 0),
            "itemSubType": plug_def.get("itemSubType", 0),
        }

    # === Vendor Data Processing ===

    def decode_vendor_data(
        self,
        vendor_data: Dict[str, Any],
        target_vendor_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Decode vendor response data using a single SQLite connection & per-call cache."""
        if not vendor_data or "Response" not in vendor_data:
            return vendor_data
        if not self.has_manifest():
            logger.warning("Manifest SQLite missing; returning undecoded vendor payload.")
            return vendor_data

        response = vendor_data["Response"]
        cache: Dict[Tuple[str, int], Optional[Dict[str, Any]]] = {}

        with contextlib.closing(self.connect_db()) as conn:
            self._decode_vendors(
                response,
                target_vendor_hash=target_vendor_hash,
                conn=conn,
                cache=cache,
            )
            self._decode_sales(
                response,
                target_vendor_hash=target_vendor_hash,
                conn=conn,
                cache=cache,
            )

        return vendor_data

    def _decode_vendors(
        self,
        response: Dict[str, Any],
        target_vendor_hash: Optional[str] = None,
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> None:
        vendors_data = response.get("vendors", {}).get("data", {})
        for vendor_hash, vendor_info in vendors_data.items():
            if target_vendor_hash is not None and str(vendor_hash) != str(target_vendor_hash):
                continue
            vendor_def = self.get_definition(
                "DestinyVendorDefinition", vendor_hash, conn=conn, cache=cache
            )
            if vendor_def and "displayProperties" in vendor_def:
                vendor_info["name"] = vendor_def["displayProperties"].get(
                    "name", "Unknown vendor"
                )
                vendor_info["description"] = vendor_def["displayProperties"].get(
                    "description", ""
                )

    def _decode_sales(
        self,
        response: Dict[str, Any],
        target_vendor_hash: Optional[str] = None,
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> None:
        sales_data = response.get("sales", {}).get("data", {})

        for vendor_hash, vendor_sales in sales_data.items():
            if target_vendor_hash is not None and str(vendor_hash) != str(target_vendor_hash):
                continue
            if "saleItems" not in vendor_sales:
                continue

            filtered_sale_items = {}
            seen_items = set()

            for sale_key, sale_item in vendor_sales["saleItems"].items():
                if self._should_skip_item(sale_item, seen_items, conn=conn, cache=cache):
                    continue

                processed_item = self._process_sale_item(
                    sale_item,
                    response,
                    vendor_hash=str(vendor_hash),
                    sale_key=str(sale_key),
                    conn=conn,
                    cache=cache,
                )
                if processed_item:
                    filtered_sale_items[sale_key] = processed_item

            vendor_sales["saleItems"] = filtered_sale_items

    def _should_skip_item(
        self,
        sale_item: Dict[str, Any],
        seen_items: set,
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> bool:
        item_hash = sale_item.get("itemHash")
        if not item_hash:
            return True

        item_def = self.get_item_definition(item_hash, conn=conn, cache=cache)
        if not item_def or "displayProperties" not in item_def:
            return True

        item_name = item_def["displayProperties"].get("name", "").strip()
        if not item_name or self.is_navigation_link(item_name):
            return True

        dedup_key = (item_name, item_def.get("classType", self.CLASS_ALL))
        if dedup_key in seen_items:
            return True

        seen_items.add(dedup_key)
        return False

    def _process_sale_item(
        self,
        sale_item: Dict[str, Any],
        response: Dict[str, Any],
        vendor_hash: str,
        sale_key: str,
        conn: Optional[sqlite3.Connection] = None,
        cache: Optional[Dict[Tuple[str, int], Optional[Dict[str, Any]]]] = None,
    ) -> Optional[Dict[str, Any]]:
        item_hash = sale_item.get("itemHash")
        if not item_hash:
            return None

        instance_key = str(sale_item.get("vendorItemIndex", sale_key))

        item_instance_data = self._get_item_component(
            response, vendor_hash, "instances", "itemInstances", instance_key
        )
        sockets_data = self._get_item_component(
            response, vendor_hash, "sockets", "itemSockets", instance_key
        )
        stats_data = self._get_item_component(
            response, vendor_hash, "stats", "itemStats", instance_key
        )

        detailed_info = self.get_item_detailed_info(
            item_hash,
            item_instance_data=item_instance_data,
            sockets_data=sockets_data,
            stats_data=stats_data,
            conn=conn,
            cache=cache,
        )

        if not detailed_info:
            return None

        stats_list = [
            {
                "hash": s["hash"],
                "name": s["name"],
                "value": s["value"],
                "maximum": s.get("maximum", 100),
            }
            for s in detailed_info["stats"].values()
        ]

        sale_item.update(
            {
                "itemName": detailed_info["displayProperties"].get("name", ""),
                "itemDescription": detailed_info["displayProperties"].get("description", ""),
                "itemTypeDisplayName": detailed_info["itemTypeDisplayName"],
                "itemIcon": detailed_info["displayProperties"].get("icon", ""),
                "rarity": detailed_info["rarity"],
                "classType": detailed_info["classType"],
                "supportedClasses": detailed_info["supportedClasses"],
                "flavorText": detailed_info["flavorText"],
                "perks": detailed_info["perks"],
                "stats": stats_list,
                "damageType": detailed_info["damageType"],
                "powerLevel": detailed_info["powerLevel"],
            }
        )
        return sale_item

    @staticmethod
    def _get_item_component(
        response: Dict[str, Any],
        vendor_hash: str,
        nested_key: str,
        legacy_key: str,
        instance_key: str,
    ) -> Optional[Dict[str, Any]]:
        """Read per-vendor itemComponents[vendorHash][nested_key], with legacy top-level fallback."""
        vendor_components = response.get("itemComponents", {}).get(vendor_hash, {})
        nested_val = vendor_components.get(nested_key, {}).get("data", {}).get(instance_key)
        if nested_val is not None:
            return nested_val
        return response.get(legacy_key, {}).get("data", {}).get(instance_key)

    # === Utility Methods ===

    def get_rarity_name(self, tier_type: int) -> str:
        rarities = {
            0: "Unknown",
            1: "Currency",
            2: "Common",
            3: "Uncommon",
            4: "Rare",
            5: "Legendary",
            6: "Exotic",
        }
        return rarities.get(tier_type, "Unknown")

    def get_class_name(self, class_type: int) -> str:
        classes = {
            self.CLASS_TITAN: "Titan",
            self.CLASS_HUNTER: "Hunter",
            self.CLASS_WARLOCK: "Warlock",
            self.CLASS_ALL: "All Classes",
        }
        return classes.get(class_type, "Unknown")

    def get_supported_classes(self, item_def: Dict[str, Any]) -> List[str]:
        if not item_def:
            return []

        class_type = item_def.get("classType", self.CLASS_ALL)
        if class_type == self.CLASS_ALL:
            return ["Titan", "Hunter", "Warlock"]

        class_name = self.get_class_name(class_type)
        return [class_name] if class_name != "Unknown" else []

    def is_navigation_link(self, item_name: str) -> bool:
        if not item_name:
            return False
        name_lower = item_name.strip().lower()
        return name_lower in self.EXACT_NAVIGATION_LINKS


manifest_decoder = ManifestDecoder()
