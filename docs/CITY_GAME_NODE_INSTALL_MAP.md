# Cedar Rapids city game — node install map

**Status:** Internal · fill during Phase C install  
**Season:** `cr_season_01_wake` · [`site/data/city-game-cr-season-01.json`](../site/data/city-game-cr-season-01.json)

**Not the player map:** Public read-only **city state board** for players is specified in [`CITY_GAME_MAP_DASHBOARD.md`](CITY_GAME_MAP_DASHBOARD.md). This spreadsheet is operator install + steward contacts only — never publish GPS or steward PII on the website.

**Phase C gate:** All rows must show **Installed? ☑** and **QR issued? ☑** before physical install QA ([`CITY_GAME_INSTALL_QA.md`](CITY_GAME_INSTALL_QA.md)). Engineering registry (**40 nodes**, object IDs) is verified by `npm run verify:city-game`.

---

## Registry

| node_id | Label | District | object_id | Installed? | QR issued? | Notes |
|---------|-------|----------|-----------|------------|------------|-------|
| node_01 | NewBo relay arch | newbo | obj_cr_node_01_newbo | ☐ | ☑ | |
| node_02 | NewBo café window | newbo | obj_cr_node_02_cafe | ☐ | ☑ | Sanctuary |
| node_03 | NewBo mural alley | newbo | obj_cr_node_03_mural | ☐ | ☑ | |
| node_04 | Riverwalk River Lantern | river_spine | obj_cr_node_04_river | ☐ | ☑ | Temp drop · unlocks node_07 |
| node_05 | 16th Avenue bridge | river_spine | obj_cr_node_05_bridge | ☐ | ☑ | Compromise drill |
| node_06 | Skywalk note | downtown | obj_cr_node_06_skywalk | ☐ | ☑ | |
| node_07 | Czech Village cabinet | czech_village | obj_cr_node_07_cabinet | ☐ | ☑ | Dilemma node |
| node_08 | Czech Village square bench | czech_village | obj_cr_node_08_bench | ☐ | ☑ | Living infra |
| node_09 | Czech Village mural | czech_village | obj_cr_node_09_mural | ☐ | ☑ | Fragment 1/3 |
| node_10 | Library witness seal | downtown | obj_cr_node_10_library | ☐ | ☑ | Vouch for node_07 |
| node_11 | Greene Square marker | greene_square | obj_cr_node_11_marker | ☐ | ☑ | Fragment 2/3 |
| node_12 | Greene Square bench | greene_square | obj_cr_node_12_bench | ☐ | ☑ | Sanctuary |
| node_13 | Downtown alley arch | downtown | obj_cr_node_13_finale | ☐ | ☑ | Finale |
| node_14 | River fountain / rain garden | river_spine | obj_cr_node_14_fountain | ☐ | ☑ | **Care loop steward ↓** |
| node_15 | Downtown market steps | downtown | obj_cr_node_15_steps | ☐ | ☑ | |
| node_16 | Red treaty · NewBo depot wall | newbo | obj_cr_node_16_red_hq | ☐ | ☑ | sanctuary · faction_hq · open |
| node_17 | Blue treaty · Downtown postcard row | downtown | obj_cr_node_17_blue_hq | ☐ | ☑ | sanctuary · faction_hq · open |
| node_18 | Green treaty · Greene pavilion | greene_square | obj_cr_node_18_green_hq | ☐ | ☑ | sanctuary · faction_hq · open |
| node_19 | Yellow treaty · heritage house stoop | czech_village | obj_cr_node_19_yellow_hq | ☐ | ☑ | sanctuary · faction_hq · open |
| node_20 | Ward cache · levee post | river_spine | obj_cr_node_20_ward_cache | ☐ | ☑ | relay_gate · artifact · open |
| node_21 | Signal stone · alley niche | downtown | obj_cr_node_21_signal_stone | ☐ | ☑ | relay_gate · artifact · open |
| node_22 | Glitch coil · market threshold | newbo | obj_cr_node_22_glitch_coil | ☐ | ☑ | relay_gate · artifact · open |
| node_23 | Museum intel · study hall door | downtown | obj_cr_node_23_museum_intel | ☐ | ☑ | lore_archive · resource · open |
| node_24 | River clue · amphitheater rail | river_spine | obj_cr_node_24_river_clue | ☐ | ☑ | lore_archive · resource · open |
| node_25 | Heritage clue · museum walk | czech_village | obj_cr_node_25_heritage_clue | ☐ | ☑ | lore_archive · resource · open |
| node_26 | Archives scarcity · witness desk | downtown | obj_cr_node_26_archives_scarcity | ☐ | ☑ | witness · resource · open |
| node_27 | Fest drop · square pop-up | greene_square | obj_cr_node_27_fest_drop | ☐ | ☑ | temp_drop · resource · open |
| node_28 | Courier witness · chalk board | newbo | obj_cr_node_28_courier_witness | ☐ | ☑ | witness · resource · open |
| node_29 | Plaza switch · dormant until mid-season | downtown | obj_cr_node_29_plaza_switch | ☐ | ☑ | finale · world_event · open |
| node_30 | Night market · dormant Friday beat | river_spine | obj_cr_node_30_night_market | ☐ | ☑ | lore_archive · world_event · open |
| node_31 | CSPS hall relay gate | newbo | obj_cr_node_31_csps_gate | ☐ | ☑ | relay_gate · common_relay · open |
| node_32 | NewBo trailhead relay | newbo | obj_cr_node_32_trail_head | ☐ | ☑ | relay_gate · common_relay · open |
| node_33 | Paramount alley relay | downtown | obj_cr_node_33_paramount | ☐ | ☑ | relay_gate · common_relay · open |
| node_34 | Third Avenue corridor relay | downtown | obj_cr_node_34_3rd_corr | ☐ | ☑ | relay_gate · common_relay · open |
| node_35 | Ground transport hub relay | downtown | obj_cr_node_35_transfer | ☐ | ☑ | relay_gate · common_relay · open |
| node_36 | Czech Museum plaza relay | czech_village | obj_cr_node_36_ncs | ☐ | ☑ | relay_gate · common_relay · open |
| node_37 | Village bakery window relay | czech_village | obj_cr_node_37_bakery | ☐ | ☑ | relay_gate · common_relay · open |
| node_38 | McGrath amphitheater relay | river_spine | obj_cr_node_38_amphitheater | ☐ | ☑ | relay_gate · common_relay · open |
| node_39 | River trail mile marker relay | river_spine | obj_cr_node_39_trail_mile | ☐ | ☑ | relay_gate · common_relay · open |
| node_40 | Greene summer stage relay | greene_square | obj_cr_node_40_stage | ☐ | ☑ | relay_gate · common_relay · open |

---

## node_14 care loop — steward contacts

| Role | Name | Contact | Notes |
|------|------|---------|-------|
| Primary maintainer | `[fill]` | `[fill]` | Signs care stream pauses |
| Backup | `[fill]` | `[fill]` | Weekend coverage |
| Game operator | `[fill]` | offline key | Flips game state only |

**Hard boundary:** Players report discovery; stewards sign maintenance truth. Game copy never certifies safety.

---

## Mobile lore (optional)

| print_artifact_id | profile_id | Label | Enrolled? |
|-------------------|------------|-------|-----------|
| | | | |

Use `npm run city-game:enroll-mobile-lore -- --write …`
