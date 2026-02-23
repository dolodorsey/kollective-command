#!/usr/bin/env python3
"""
IG Location & Hashtag Scraper for Kollective Lead Source Engine
───────────────────────────────────────────────────────────────
Scrapes Instagram profiles from locations and hashtags.
Feeds results into Supabase contacts_master + social_outreach_targets.

Usage:
  python ig_scraper.py --mode location --query "Atlanta GA restaurants" --brand casper_group --limit 50
  python ig_scraper.py --mode hashtag --query "atlantanightlife" --brand huglife --limit 30
  python ig_scraper.py --mode google --query "restaurants near Atlanta" --brand casper_group --limit 20

Designed for slow, consistent scraping (50-100/day per source).
"""

import argparse
import json
import time
import random
import hashlib
import re
import sys
from datetime import datetime
from urllib.parse import quote_plus

try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

# ─── Config ───────────────────────────────────────────────

SUPABASE_URL = "https://dzlmtvodpyhetvektfuo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6bG10dm9kcHloZXR2ZWt0ZnVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU4NDg2NCwiZXhwIjoyMDg1MTYwODY0fQ.lhtEGfGYYhEZxzrUl3EN1h53IPyfM8TBpwpoFqdgQVs"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# ─── Instagram Scraping (Public API, no auth needed) ──────

IG_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "X-IG-App-ID": "936619743392459",
}


def scrape_ig_hashtag(tag: str, limit: int = 50) -> list:
    """Scrape profiles from an IG hashtag page via public GraphQL API."""
    tag = tag.lstrip("#").strip()
    url = f"https://www.instagram.com/explore/tags/{quote_plus(tag)}/?__a=1&__d=dis"
    
    profiles = []
    try:
        resp = requests.get(url, headers=IG_HEADERS, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            edges = (data.get("graphql", {}).get("hashtag", {}).get("edge_hashtag_to_media", {}).get("edges", [])
                     or data.get("data", {}).get("hashtag", {}).get("edge_hashtag_to_media", {}).get("edges", []))
            
            for edge in edges[:limit]:
                node = edge.get("node", {})
                owner = node.get("owner", {})
                if owner.get("username"):
                    profiles.append({
                        "handle": owner["username"],
                        "source": f"ig_hashtag_{tag}",
                    })
        elif resp.status_code == 429:
            print(f"  ⚠️ Rate limited on #{tag}. Waiting 60s...")
            time.sleep(60)
        else:
            print(f"  IG hashtag API returned {resp.status_code}")
    except Exception as e:
        print(f"  Error scraping #{tag}: {e}")
    
    return profiles


def scrape_ig_location_search(query: str, limit: int = 50) -> list:
    """Search IG for location-tagged posts."""
    url = f"https://www.instagram.com/web/search/topsearch/?context=place&query={quote_plus(query)}"
    
    profiles = []
    try:
        resp = requests.get(url, headers=IG_HEADERS, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            places = data.get("places", [])
            for place in places[:5]:
                loc = place.get("place", {}).get("location", {})
                loc_id = loc.get("pk")
                loc_name = loc.get("name", "")
                if loc_id:
                    profiles.append({
                        "company": loc_name,
                        "handle": loc.get("short_name", ""),
                        "address": loc.get("address", ""),
                        "city": loc.get("city", ""),
                        "source": f"ig_location_{query}",
                        "source_id": str(loc_id),
                    })
            
            # Also grab user results
            users = data.get("users", [])
            for user in users[:limit]:
                u = user.get("user", {})
                if u.get("username"):
                    profiles.append({
                        "handle": u["username"],
                        "full_name": u.get("full_name", ""),
                        "followers": u.get("follower_count", 0),
                        "source": f"ig_location_{query}",
                    })
        elif resp.status_code == 429:
            print(f"  ⚠️ Rate limited. Waiting 60s...")
            time.sleep(60)
    except Exception as e:
        print(f"  Error searching IG for '{query}': {e}")
    
    return profiles


def scrape_google_maps(query: str, limit: int = 20) -> list:
    """Scrape business info from Google search (fallback without Maps API)."""
    profiles = []
    # Uses a simple Google search for business listings
    search_url = f"https://www.google.com/search?q={quote_plus(query)}&num={limit}"
    
    try:
        resp = requests.get(search_url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }, timeout=15)
        
        if resp.status_code == 200:
            # Extract business names and details from search results
            # This is a lightweight approach — for production, use Google Places API
            text = resp.text
            
            # Find business listing patterns
            # Look for structured data
            phone_pattern = re.compile(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')
            phones = phone_pattern.findall(text)[:limit]
            
            for phone in phones:
                profiles.append({
                    "phone": phone,
                    "source": f"google_{query}",
                })
            
            print(f"  Found {len(profiles)} phone numbers from Google search")
    except Exception as e:
        print(f"  Error scraping Google for '{query}': {e}")
    
    return profiles


# ─── Supabase Upload ─────────────────────────────────────

def upload_to_supabase(profiles: list, brand_key: str, city: str = ""):
    """Upload scraped profiles to contacts_master and social_outreach_targets."""
    
    contacts = []
    targets = []
    
    for p in profiles:
        handle = p.get("handle", "").strip().lstrip("@")
        
        if handle:
            # Social outreach target
            targets.append({
                "handle": handle,
                "full_name": p.get("full_name", ""),
                "city": city or p.get("city", ""),
                "brand_key": brand_key,
                "platform": "instagram",
                "status": "ready",
                "tags": p.get("source", ""),
                "followers": p.get("followers", 0),
            })
        
        # Contact record (if we have more info)
        if handle or p.get("email") or p.get("phone"):
            contacts.append({
                "instagram_handle": handle,
                "full_name": p.get("full_name", ""),
                "company": p.get("company", ""),
                "phone": p.get("phone", ""),
                "email": p.get("email", ""),
                "city": city or p.get("city", ""),
                "address": p.get("address", ""),
                "source": p.get("source", f"scrape_{brand_key}"),
                "brand_associations": brand_key,
                "tags": p.get("source", ""),
            })
    
    # Deduplicate by handle
    seen = set()
    unique_targets = []
    for t in targets:
        if t["handle"] not in seen:
            seen.add(t["handle"])
            unique_targets.append(t)
    
    seen_contacts = set()
    unique_contacts = []
    for c in contacts:
        key = c.get("instagram_handle") or c.get("email") or c.get("phone")
        if key and key not in seen_contacts:
            seen_contacts.add(key)
            unique_contacts.append(c)
    
    # Upload in batches
    synced_targets = 0
    synced_contacts = 0
    
    for i in range(0, len(unique_targets), 50):
        batch = unique_targets[i:i+50]
        r = requests.post(f"{SUPABASE_URL}/rest/v1/social_outreach_targets", headers=HEADERS, json=batch)
        if r.status_code in (200, 201):
            synced_targets += len(batch)
        else:
            # Try one by one
            for item in batch:
                r2 = requests.post(f"{SUPABASE_URL}/rest/v1/social_outreach_targets", headers=HEADERS, json=item)
                if r2.status_code in (200, 201):
                    synced_targets += 1
    
    for i in range(0, len(unique_contacts), 50):
        batch = unique_contacts[i:i+50]
        r = requests.post(f"{SUPABASE_URL}/rest/v1/contacts_master", headers=HEADERS, json=batch)
        if r.status_code in (200, 201):
            synced_contacts += len(batch)
        else:
            for item in batch:
                r2 = requests.post(f"{SUPABASE_URL}/rest/v1/contacts_master", headers=HEADERS, json=item)
                if r2.status_code in (200, 201):
                    synced_contacts += 1
    
    return synced_targets, synced_contacts


# ─── Log to command_log ──────────────────────────────────

def log_scrape(mode, query, brand, city, results_count, targets_synced, contacts_synced):
    requests.post(f"{SUPABASE_URL}/rest/v1/command_log", headers=HEADERS, json={
        "command_type": "brand.scrape_leads",
        "scope": brand,
        "target_key": f"{mode}:{query}",
        "status": "success",
        "payload": {
            "mode": mode,
            "query": query,
            "city": city,
            "results_found": results_count,
            "targets_synced": targets_synced,
            "contacts_synced": contacts_synced,
        },
        "executed_at": datetime.utcnow().isoformat() + "Z",
    })


# ─── Main ────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="IG Lead Scraper for Kollective")
    parser.add_argument("--mode", choices=["location", "hashtag", "google"], required=True)
    parser.add_argument("--query", required=True, help="Search query or hashtag")
    parser.add_argument("--brand", required=True, help="Brand key (e.g., casper_group, huglife)")
    parser.add_argument("--city", default="", help="City override")
    parser.add_argument("--limit", type=int, default=50, help="Max results")
    args = parser.parse_args()
    
    print(f"\n{'='*50}")
    print(f"  Kollective Lead Scraper")
    print(f"  Mode: {args.mode} | Query: {args.query}")
    print(f"  Brand: {args.brand} | Limit: {args.limit}")
    print(f"{'='*50}\n")
    
    if args.mode == "hashtag":
        profiles = scrape_ig_hashtag(args.query, args.limit)
    elif args.mode == "location":
        profiles = scrape_ig_location_search(args.query, args.limit)
    elif args.mode == "google":
        profiles = scrape_google_maps(args.query, args.limit)
    else:
        profiles = []
    
    print(f"  Found {len(profiles)} profiles")
    
    if profiles:
        # Random delay to appear human
        delay = random.uniform(1, 3)
        print(f"  Waiting {delay:.1f}s before upload...")
        time.sleep(delay)
        
        targets_synced, contacts_synced = upload_to_supabase(profiles, args.brand, args.city)
        print(f"  Synced: {targets_synced} targets, {contacts_synced} contacts")
        
        log_scrape(args.mode, args.query, args.brand, args.city, len(profiles), targets_synced, contacts_synced)
        print(f"  ✅ Logged to command_log")
    else:
        print(f"  ⚠️ No profiles found")
    
    print()


if __name__ == "__main__":
    main()
