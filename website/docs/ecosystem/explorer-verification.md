---
id: explorer-verification
sidebar_position: 7
title: Explorer Verification
---

# Explorer Verification

These are the IGEO7 conformance notes for the [Explore](/explore) page. They
cover what was checked, how to reproduce it, and what is still outstanding.

## Configuration under test

| Parameter | Value |
|---|---|
| Engine | webDggrid 1.9.0 (DGGRID compiled to WebAssembly) |
| Projection | ISEA |
| Topology | Hexagon |
| Aperture | 7 |
| Icosahedron orientation longitude | **11.2** (not DGGRID's default 11.25) |
| Pole latitude | 58.28252559 |
| Azimuth | 0 |
| Authalic latitude conversion | Enabled, both directions |

## How to reproduce

```bash
cd website
npm ci
node scripts/verify-igeo7.mjs          # built-in test points
node scripts/verify-igeo7.mjs --md     # same, as a markdown table
```

The harness at `website/scripts/verify-igeo7.mjs` uses the same configuration
as the explorer component and exits non-zero on any failure.

To check against a set of expected values, supply a CSV:

```bash
node scripts/verify-igeo7.mjs testpoints.csv
```

```csv
lat,lon,resolution,expected_z7
38.7223,-9.1393,5,0064156
```

## Test points

The built-in set covers the golden anchor, the lab's own location, the equator
where authalic and geodetic latitude coincide, the antimeridian, both poles, and
high and low latitudes in both hemispheres: Lisbon, Tartu, Null Island, Quito,
Singapore, Auckland, Suva, Anchorage, Ushuaia, North Pole, South Pole. Each is
evaluated at every resolution from 0 to 15, giving 176 cases.

Each case asserts four things:

1. The Z7 index is valid.
2. The cell's own centroid resolves back to that same cell.
3. The neighbour count is 5 or 6, the only counts IGEO7 admits.
4. For the Lisbon reference point, the index equals a known-good expected value
   at every resolution from 0 to 10.

The fourth assertion is what pins the configuration. Without it the sweep only
proves internal self-consistency, which a wrongly configured grid also has.

Note carefully what each row proves. All 176 cases are checked for
self-consistency, assertions 1 to 3. Only the Lisbon rows are additionally
checked against an external oracle, and that table stops at resolution 10
because the lab's pydggal source does. Resolutions 11 to 15 are therefore
regression coverage of the newly exposed range, not conformance. Extending the
expected-value table upward would need five more indices from an independent
implementation.

### What the reference point can and cannot prove

This is worth stating precisely, because it affects how much any single anchor
value certifies.

The reference index `0064156` at resolution 5 **does** prove the authalic
conversion is applied: feeding raw geodetic latitude instead yields `0064154`.

It does **not** prove the 11.2 orientation. Resolutions 0 to 5 are identical
under 11.2 and under DGGRID's default 11.25. The two first diverge at
resolution 6:

| Orientation | Resolution 5 | Resolution 6 |
|---|---|---|
| 11.2 (IGEO7) | `0064156` | `00641565` |
| 11.25 (DGGRID default) | `0064156` | `00641542` |

So the orientation is only pinned by the resolution 6 and deeper rows, which is
why the expected table runs to resolution 10 rather than stopping at the anchor.
Any additional test points intended to confirm the orientation need to be at
resolution 6 or deeper to be meaningful.

Both assertions were confirmed by mutation testing: setting the orientation to
11.25, or removing the authalic conversions, each makes the harness fail. An
earlier version of the harness passed under both mutations, which is what
prompted adding the expected-value assertions.

## Results

**176 of 176 cases pass.**

The golden anchor supplied by the lab is Lisbon at 38.7223, -9.1393, which must
give `0064156` / `0x0D0DDFFFFFFFFFFF` at resolution 5. It does, and the full
hierarchy above and below it is consistent:

| Resolution | Z7 index | Hex | Centroid (WGS84) | Type |
|---|---|---|---|---|
| 0 | `00` | `0x0FFFFFFFFFFFFFFF` | 58.3971, 11.2000 | Pentagon |
| 1 | `006` | `0x0DFFFFFFFFFFFFFF` | 34.7974, 4.7960 | Hexagon |
| 2 | `0064` | `0x0D3FFFFFFFFFFFFF` | 34.4425, -7.7006 | Hexagon |
| 3 | `00641` | `0x0D0FFFFFFFFFFFFF` | 38.0164, -7.6527 | Hexagon |
| 4 | `006415` | `0x0D0DFFFFFFFFFFFF` | 39.1282, -8.8782 | Hexagon |
| **5** | **`0064156`** | **`0x0D0DDFFFFFFFFFFF`** | 38.6169, -8.8745 | Hexagon |
| 6 | `00641565` | `0x0D0DD7FFFFFFFFFF` | 38.7748, -9.0513 | Hexagon |
| 7 | `006415654` | `0x0D0DD67FFFFFFFFF` | 38.7441, -9.1389 | Hexagon |
| 8 | `0064156546` | `0x0D0DD66FFFFFFFFF` | 38.7189, -9.1511 | Hexagon |
| 9 | `00641565463` | `0x0D0DD667FFFFFFFF` | 38.7232, -9.1386 | Hexagon |
| 10 | `006415654630` | `0x0D0DD6663FFFFFFF` | 38.7232, -9.1386 | Hexagon |

Each index is a prefix of the next, as Z7 requires. At resolution 10 the
centroid sits about 0.0012 degrees from the queried point, roughly 120 m, well
inside a cell whose spacing at that resolution is about 420 m.

Tartu at 58.3776, 26.729 behaves the same way, resolving to `000102245414` at
resolution 10 with a centroid of 58.3772, 26.7294.

## A note on the authalic conversion

The authalic conversion is a round trip and both halves are required. The engine
works in authalic latitude; the map works in WGS84 geodetic latitude.

An early version of the explorer converted geodetic to authalic on input but did
not convert back on output, so the authalic latitude returned by
`sequenceNumToGeo` was shown directly as the cell centroid. The offset that
introduces is:

| Latitude | Offset (degrees) | Offset (km) |
|---|---|---|
| 0 | 0.000 | 0.0 |
| 30 | 0.111 | 12.3 |
| 45 | 0.128 | 14.3 |
| 58 | 0.115 | 12.8 |
| 85 | 0.022 | 2.5 |

The maximum is 0.1283 degrees, at latitude 45.05. Kilometre figures use about
111 km per degree of latitude and are approximate.

This is smaller than a cell at coarse resolutions, so it is easy to miss, but
from about resolution 6 it exceeds the cell size and the centroid no longer
falls inside its own cell. The centroid round-trip check failed 29 of 121 cases
before the inverse conversion was added, and passes 176 of 176 with it.

Worth noting for anyone doing similar work: the golden anchor did not catch
this, because a single point matching only exercises the geographic to cell
direction. The round-trip check is what exposed it.

## Adding more test points

The test points above were chosen to exercise the cases most likely to break: the
poles, the antimeridian, the equator, and both hemispheres, anchored on the
lab's Lisbon reference value.

To check the explorer against any other set of expected values, drop them into a
CSV in the format shown above and pass it to the harness. It reports a pass or
fail per row and exits non-zero on any mismatch, so it can be extended or wired
into CI at any point without changing the explorer itself.
