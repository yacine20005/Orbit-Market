"""
Routes for Xûr (Agent of the Nine) data
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from backend import bungie_api
from backend.manifest_decoder import manifest_decoder

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/xur", tags=["xur"])

XUR_VENDOR_HASH = "2190858386"


def _is_xur_scheduled(now_utc: datetime | None = None) -> bool:
    """Bungie global UTC schedule: Friday 17:00 UTC to Tuesday 17:00 UTC."""
    now = now_utc or datetime.now(timezone.utc)
    day = now.weekday()  # 0 = Mon, 1 = Tue, ..., 4 = Fri, 5 = Sat, 6 = Sun
    hour = now.hour
    return (
        (day == 4 and hour >= 17)
        or day in (5, 6, 0)
        or (day == 1 and hour < 17)
    )


def _default_xur_vendor() -> Dict[str, Any]:
    return {
        "vendorHash": int(XUR_VENDOR_HASH),
        "nextRefreshDate": "",
        "enabled": False,
        "name": "Xûr",
        "description": "Agent of the Nine",
    }


def _build_debug_payload(response: Dict[str, Any]) -> Dict[str, Any]:
    debug_info: Dict[str, Any] = {
        "available_components": list(response.keys()),
        "manifest_available": manifest_decoder.has_manifest(),
        "xur_vendor_exists": XUR_VENDOR_HASH in response.get("vendors", {}).get("data", {}),
        "sales_structure": {},
        "exotic_items_analysis": {},
    }

    sales_root = response.get("sales", {}).get("data", {})
    if isinstance(sales_root, dict):
        xur_sales = sales_root.get(XUR_VENDOR_HASH, {})
        sale_items = xur_sales.get("saleItems", {})
        debug_info["sales_structure"] = {
            "has_saleItems": "saleItems" in xur_sales,
            "sale_items_count": len(sale_items),
            "sale_items_keys": list(sale_items.keys()),
        }

        if manifest_decoder.has_manifest() and sale_items:
            import contextlib

            cache: Dict[Any, Any] = {}
            with contextlib.closing(manifest_decoder.connect_db()) as conn:
                for item_key, item_data in sale_items.items():
                    item_hash = item_data.get("itemHash")
                    item_def = manifest_decoder.get_item_definition(
                        item_hash, conn=conn, cache=cache
                    )
                    if not item_def:
                        continue

                    item_name = item_def.get("displayProperties", {}).get("name", "")
                    tier_type = item_def.get("inventory", {}).get("tierType", 0)
                    rarity = manifest_decoder.get_rarity_name(tier_type)

                    if tier_type == 6 or "Strange" in item_name or "Xenology" in item_name:
                        debug_info["exotic_items_analysis"][item_key] = {
                            "name": item_name,
                            "hash": item_hash,
                            "itemType": item_def.get("itemType"),
                            "itemSubType": item_def.get("itemSubType"),
                            "classType": item_def.get("classType"),
                            "supportedClasses": manifest_decoder.get_supported_classes(item_def),
                            "rarity": rarity,
                            "tierType": tier_type,
                            "costs": item_data.get("costs", []),
                            "quantity": item_data.get("quantity", 1),
                        }

    return debug_info


@router.get("")
@router.get("/", include_in_schema=False)
async def get_xur_inventory():
    """Get Xûr's inventory with decoded items (ErrorCode 0 = success)."""
    params = {
        "components": "Vendors,VendorSales,ItemSockets,ItemCommonData,ItemStats,ItemInstances,ItemPerks,ItemPlugStates"
    }
    vendor_data = await bungie_api.make_bungie_request("/Destiny2/Vendors/", params=params)
    if vendor_data is None:
        raise HTTPException(status_code=502, detail="Upstream Bungie API error")

    is_xur_currently_available = _is_xur_scheduled()

    try:
        decoded_data = await asyncio.to_thread(
            manifest_decoder.decode_vendor_data, vendor_data, XUR_VENDOR_HASH
        )

        decoded_response = decoded_data.get("Response", {})
        xur_vendor_data = (
            decoded_response.get("vendors", {}).get("data", {}).get(XUR_VENDOR_HASH)
            or _default_xur_vendor()
        )
        xur_sales_data = (
            decoded_response.get("sales", {}).get("data", {}).get(XUR_VENDOR_HASH)
            or {"saleItems": {}}
        )

        xur_response = {
            "vendor": xur_vendor_data,
            "sales": xur_sales_data,
            "isAvailable": is_xur_currently_available,
            "isLiveApi": True,
            "message": (
                "Xûr is currently available"
                if is_xur_currently_available
                else "Xûr is not currently available (showing last inventory)"
            ),
        }

        return {
            "Response": xur_response,
            "ErrorCode": 0,
            "ThrottleSeconds": decoded_data.get("ThrottleSeconds", 0),
        }
    except Exception as exc:
        logger.exception("Error decoding Xûr data: %s", exc)
        return {
            "Response": {
                "vendor": _default_xur_vendor(),
                "sales": {"saleItems": {}},
                "isAvailable": False,
                "isLiveApi": False,
                "message": "Unable to decode Xûr inventory data.",
            },
            "ErrorCode": 1,
            "ThrottleSeconds": 0,
        }


@router.get("/debug")
async def debug_xur_data():
    """Debug endpoint to inspect Bungie vendor structure for Xûr."""
    params = {
        "components": "Vendors,VendorSales,VendorCategories,ItemSockets,ItemCommonData,ItemStats,ItemInstances,ItemPerks,ItemPlugStates"
    }
    vendor_data = await bungie_api.make_bungie_request("/Destiny2/Vendors/", params=params)
    if not vendor_data:
        raise HTTPException(status_code=502, detail="Unable to retrieve data")

    response = vendor_data.get("Response", {})
    return await asyncio.to_thread(_build_debug_payload, response)
