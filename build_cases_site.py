# -*- coding: utf-8 -*-
"""
build_cases_site.py
六年級獨立研究專題：50 大歷史風情與生活科學案件 ✕ 靜態 GitHub 網站建置
【重磅升級版】：
1. 50 宗大案串聯「三大主線篇章」（初出茅廬篇、文史縱深篇、跨區連環懸案篇）
2. 六年級 108 課綱 30 秒家庭/教室生活 DIY 微實驗小手冊
3. 雙北 50~100m 在地老字號特產小吃生活補給與體力值 (HP) 恢復系統
4. 都會群像跨案人物與物證暗線伏筆連鎖網絡（50 案互為伏筆）
5. 嚴謹人物誌（職業、背景、關係、動機、口供、破綻打臉關鍵）與推導三部曲（起因、經過、最後）
6. 頂部與側邊欄「📋 複製全文」一鍵快速複製 50 案完整規格功能
7. 免安裝任何軟體，任何知道網址的人皆可在網頁上直接打字修改（所見即所得線上編輯模式）
恪守憲法級三大禁忌：一律使用「都會調查員」或「市民」，實體步行與大眾運輸，全域 0 違規。
"""

import json
import html
import os
import sys

# Load cases from SSOT cases.json
with open('cases.json', 'r', encoding='utf-8') as f:
    all_cases = json.load(f)

print(f"Loaded {len(all_cases)} cases successfully from cases.json.")

# Validate taboo words
taboos = ["少年" + "偵探", "藝" + "碩", "益" + "碩", "台北" + "捷運局長", "台北" + "縣長"]
for c in all_cases:
    dump = json.dumps(c, ensure_ascii=False)
    for t in taboos:
        if t in dump:
            raise ValueError(f"CRITICAL TABOO DETECTED: {t} in {c['id']}")

print("All 50 cases validated: Zero taboo words detected!")

def generate_case_markdown(c):
    chars_md = []
    for char in c['characters']:
        chars_md.append(f"""### 👤 {char['name']}（{char['identity']}）
- **職業身分與生活作息**：{char['job_daily']}
- **與他人關係**：{char['relation_others']}
- **與被害人關係**：{char['relation_victim']}
- **犯罪動機分析**：{char['motive']}
- **口供陳述**：{char['statement']}
- **破綻與打臉關鍵**：{char['flaw']}""")

    depo = c['deposition']
    testimony = depo.get('testimony', depo.get('testimacy', ''))
    props = c['props_and_easter_egg']
    diy = c.get('diy_experiment', {})
    food = props.get('local_food', {})
    cross = c.get('cross_case_clue', {})

    md = f"""# 【{c['id']}】{c['title']}
- **所屬篇章**：{c.get('chapter', '')}
- **案件類型**：{c['type']}
- **難度星級**：{c['difficulty']}
- **驚悚指數**：{c['spookiness']}
- **案發地點**：{c['location']}（{c['district']}）

## 🏛️ 當地歷史事件與地方風情
{c['history_culture']}
- **交通常識與生活動線**：{c['traffic_trivia']}

## 🔬 生活科學原理與鑑識依據（108 課綱）
{c['science_principle']}

## 👥 嚴謹細節人物誌
{chr(10).join(chars_md)}

## 📖 案情推導三部曲
### 【起因】
{c['story_cause']}

### 【經過】
{c['story_process']}

### 【最後】
{c['story_climax']}

## ⚖️ 官方警訊偵查筆錄
- **筆錄編號**：{depo.get('record_id', '')}
- **承辦人員**：{depo.get('officer', '')}
- **受訊人**：{depo.get('interrogee', '')}
- **受訊供述**：{testimony}
- **矛盾破綻**：{depo.get('contradiction', '')}
- **關鍵鐵證**：{depo.get('critical_evidence', '')}

## 🎒 破案輔助道具三軌與鄰近彩蛋
- **💰 金錢購買途徑**：{props.get('prop_money', '')}
- **🏛️ 親身探索途徑**：{props.get('prop_explore', '')}
- **🤝 社交打聽途徑**：{props.get('prop_social', '')}
- **🥚 鄰近文化彩蛋**：{props.get('easter_egg', '')}

## 🧫 六年級 108 課綱生活 DIY 微實驗小手冊
- **微實驗名稱**：{diy.get('title', '')}
- **準備材料**：{diy.get('materials', '')}
- **操作步驟**：{diy.get('steps', '')}
- **課綱科學解密**：{diy.get('science_explained', '')}

## 🍢 雙北 50~100m 在地老字號體力補給站
- **推薦名店**：{food.get('name', '')}（{food.get('location', '')}）
- **食用效果**：{food.get('effect', '')}
- **美食特色與文史背景**：{food.get('desc', '')}

## 🔗 都會群像跨案暗線伏筆
- **關聯案件**：{', '.join(cross.get('related_cases', []))}
- **伏筆標題**：{cross.get('clue_title', '')}
- **暗線詳情**：{cross.get('description', '')}
"""
    return md.strip()

# Generate HTML
html_parts = []
html_parts.append("""<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>《雙北漫遊：都會行蹤》50 大歷史風情與生活科學案件全集 ✕ 六年級獨立研究專題（支援線上直接編輯）</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --accent-hover: #0ea5e9;
      --border: #334155;
      --tag-bg: #0369a1;
      --gold: #fbbf24;
      --killer: #ef4444;
      --victim: #a855f7;
      --success: #10b981;
      --warn: #f59e0b;
      --purple: #8b5cf6;
      --radius: 10px;
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang TC", "Microsoft JhengHei", sans-serif;
      background: var(--bg);
      color: var(--text-main);
      line-height: 1.6;
      padding-top: 60px;
    }

    /* Fixed Sticky Toolbar */
    .top-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }
    .toolbar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--accent);
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-tool {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn-tool:hover {
      background: var(--border);
      border-color: var(--accent);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .btn-tool-edit {
      background: #f59e0b;
      color: #0f172a;
      border-color: #d97706;
      font-weight: 700;
    }
    .btn-tool-edit:hover {
      background: #d97706;
      color: #ffffff;
    }
    .btn-tool-save {
      background: #10b981;
      color: #ffffff;
      border-color: #059669;
    }
    .btn-tool-save:hover {
      background: #059669;
    }
    .btn-tool-copy-all {
      background: #0284c7;
      color: #ffffff;
      border-color: #0369a1;
      font-weight: 700;
    }
    .btn-tool-copy-all:hover {
      background: #0369a1;
    }

    /* Edit Mode Indicator */
    .edit-status-badge {
      font-size: 0.75rem;
      padding: 3px 8px;
      border-radius: 12px;
      background: #334155;
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .edit-status-badge.active {
      background: #fef3c7;
      color: #92400e;
      font-weight: 700;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    /* Container Layout */
    .app-container {
      display: flex;
      min-height: calc(100vh - 60px);
    }

    /* Sidebar */
    .sidebar {
      width: 320px;
      background: rgba(30, 41, 59, 0.7);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      height: calc(100vh - 60px);
      position: sticky;
      top: 60px;
      flex-shrink: 0;
      padding: 16px;
    }
    .sidebar-search {
      width: 100%;
      padding: 8px 12px;
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: #fff;
      font-size: 0.85rem;
      margin-bottom: 12px;
    }
    .sidebar-search:focus {
      outline: none;
      border-color: var(--accent);
    }
    .sidebar-panel {
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 14px;
      font-size: 0.8rem;
    }
    .sidebar-panel-title {
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sidebar-chapter-heading {
      font-size: 0.78rem;
      font-weight: 800;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.12);
      border-left: 3px solid #f59e0b;
      padding: 6px 8px;
      margin: 12px 0 6px 0;
      border-radius: 0 4px 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sidebar-nav-list {
      list-style: none;
    }
    .sidebar-nav-item {
      margin-bottom: 4px;
    }
    .sidebar-nav-link {
      display: block;
      padding: 6px 10px;
      border-radius: 6px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.85rem;
      transition: all 0.15s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sidebar-nav-link:hover {
      background: #0f172a;
      color: var(--accent);
    }

    /* Content Area */
    .content-area {
      flex: 1;
      padding: 24px 32px;
      max-width: 1280px;
      margin: 0 auto;
    }

    /* Header Nav */
    .header-nav {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
    }
    .header-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 8px;
    }
    .header-subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .header-highlights {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 14px;
    }
    .highlight-pill {
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: var(--accent);
      font-size: 0.8rem;
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 600;
    }

    /* Filter Toolbar */
    .filter-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 20px;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
    }
    .filter-group {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    .filter-group:last-child { margin-bottom: 0; }
    .filter-label {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-muted);
      min-width: 80px;
    }
    .filter-chip {
      background: #0f172a;
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }
    .filter-chip:hover {
      border-color: var(--accent);
      color: var(--text-main);
    }
    .filter-chip.active {
      background: var(--accent);
      border-color: var(--accent);
      color: #0f172a;
      font-weight: 700;
    }
    .filter-chip-chapter {
      border-color: rgba(245, 158, 11, 0.4);
      color: #f59e0b;
    }
    .filter-chip-chapter.active {
      background: #f59e0b;
      border-color: #f59e0b;
      color: #0f172a;
      font-weight: 700;
    }

    /* Case Card */
    .case-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 32px;
      box-shadow: var(--shadow);
      overflow: hidden;
      transition: border-color 0.2s ease;
    }
    .case-card:hover {
      border-color: rgba(56, 189, 248, 0.5);
    }
    .case-card.is-edited {
      border-left: 4px solid var(--warn);
    }
    .case-header {
      background: rgba(15, 23, 42, 0.6);
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .case-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .case-id-badge {
      background: var(--accent);
      color: #0f172a;
      font-size: 0.85rem;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .case-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
    }
    .card-edited-tag {
      display: none;
      font-size: 0.72rem;
      background: #fef3c7;
      color: #b45309;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .case-card.is-edited .card-edited-tag {
      display: inline-block;
    }
    .case-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .badge {
      font-size: 0.78rem;
      padding: 3px 8px;
      border-radius: 6px;
      background: #0f172a;
      border: 1px solid var(--border);
      color: var(--text-muted);
    }
    .badge-chapter {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      font-weight: 700;
    }
    .badge-type {
      background: rgba(56, 189, 248, 0.15);
      border-color: rgba(56, 189, 248, 0.3);
      color: var(--accent);
      font-weight: 600;
    }
    .badge-diff { color: var(--gold); border-color: rgba(251, 191, 36, 0.3); }
    .badge-spook { color: #f472b6; border-color: rgba(244, 114, 182, 0.3); }
    .badge-location { color: #4ade80; border-color: rgba(74, 222, 128, 0.3); }

    /* Case Body Sections */
    .case-body {
      padding: 20px;
    }
    .section-block {
      margin-bottom: 20px;
    }
    .section-block:last-child { margin-bottom: 0; }
    .section-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
      padding-bottom: 4px;
    }
    .section-content {
      font-size: 0.9rem;
      color: #cbd5e1;
    }
    .section-content p {
      margin-bottom: 8px;
    }

    /* 3-Acts推導三部曲 */
    .acts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
      margin-top: 8px;
    }
    .act-box {
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px 14px;
    }
    .act-header {
      font-weight: 700;
      font-size: 0.85rem;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .act-cause { color: #60a5fa; border-top: 3px solid #60a5fa; }
    .act-process { color: #facc15; border-top: 3px solid #facc15; }
    .act-climax { color: #f87171; border-top: 3px solid #f87171; }
    .act-desc {
      font-size: 0.85rem;
      color: #94a3b8;
      line-height: 1.5;
    }

    /* Characters Grid */
    .characters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
      margin-top: 8px;
    }
    .character-card {
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      font-size: 0.83rem;
    }
    .character-card.killer {
      border-color: rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.05);
    }
    .character-card.victim {
      border-color: rgba(168, 85, 247, 0.5);
      background: rgba(168, 85, 247, 0.05);
    }
    .char-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .char-identity {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: normal;
    }
    .char-field {
      margin-bottom: 4px;
      color: #cbd5e1;
    }
    .char-field strong {
      color: #94a3b8;
    }
    .char-flaw {
      color: #f87171;
      font-weight: 600;
    }

    /* Deposition & Props */
    .depo-box {
      background: #0f172a;
      border-left: 3px solid var(--gold);
      border-radius: 4px;
      padding: 10px 14px;
      font-size: 0.85rem;
      margin-top: 8px;
    }
    .depo-item { margin-bottom: 4px; }
    .depo-item strong { color: var(--gold); }

    .props-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 8px;
      font-size: 0.83rem;
    }
    .prop-item {
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
    }
    .prop-item strong { color: var(--accent); }

    /* ★ 108 課綱生活 DIY 微實驗小手冊樣式 */
    .diy-experiment-box {
      background: linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%);
      border: 1px solid #059669;
      border-left: 4px solid #10b981;
      border-radius: 8px;
      padding: 14px 16px;
      margin-top: 10px;
    }
    .diy-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .diy-tag {
      font-size: 0.75rem;
      font-weight: 800;
      background: #10b981;
      color: #064e3b;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .diy-title {
      font-size: 0.98rem;
      font-weight: 700;
      color: #a7f3d0;
    }
    .diy-field {
      font-size: 0.85rem;
      margin-bottom: 5px;
      line-height: 1.5;
      color: #d1fae5;
    }
    .diy-field strong {
      color: #34d399;
    }
    .diy-science {
      background: rgba(6, 78, 59, 0.6);
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 6px;
      border: 1px dashed rgba(52, 211, 153, 0.4);
      font-size: 0.83rem;
      color: #ecfdf5;
    }

    /* ★ 雙北在地老字號體力補給站樣式 */
    .local-food-box {
      background: linear-gradient(135deg, rgba(120, 53, 15, 0.35) 0%, rgba(15, 23, 42, 0.8) 100%);
      border: 1px solid #d97706;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 10px;
    }
    .food-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .food-name {
      font-size: 0.98rem;
      font-weight: 700;
      color: #fde68a;
    }
    .food-hp-tag {
      font-size: 0.78rem;
      font-weight: 800;
      background: #f59e0b;
      color: #451a03;
      padding: 2px 8px;
      border-radius: 12px;
      letter-spacing: 0.5px;
    }
    .food-loc {
      font-size: 0.82rem;
      color: #cbd5e1;
      margin-bottom: 4px;
    }
    .food-loc strong { color: #fcd34d; }
    .food-desc {
      font-size: 0.84rem;
      color: #fef3c7;
      line-height: 1.5;
    }

    /* ★ 都會群像跨案暗線伏筆樣式 */
    .cross-clue-box {
      background: linear-gradient(135deg, rgba(76, 29, 149, 0.35) 0%, rgba(15, 23, 42, 0.8) 100%);
      border: 1px solid #7c3aed;
      border-left: 4px solid #a855f7;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 10px;
    }
    .cross-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .cross-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #e9d5ff;
    }
    .cross-tags {
      display: flex;
      gap: 6px;
    }
    .cross-badge {
      font-size: 0.75rem;
      font-weight: 800;
      background: #7c3aed;
      color: #f5f3ff;
      padding: 2px 8px;
      border-radius: 10px;
    }
    .cross-desc {
      font-size: 0.85rem;
      color: #ddd6fe;
      line-height: 1.5;
    }

    /* Markdown Copy Area */
    .markdown-copy-area {
      background: #090d16;
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-top: 16px;
      overflow: hidden;
    }
    .markdown-copy-header {
      background: #111827;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
    }
    .copy-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .copy-actions {
      display: flex;
      gap: 8px;
    }
    .btn-copy {
      background: #1e293b;
      border: 1px solid var(--border);
      color: #fff;
      font-size: 0.78rem;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-copy:hover {
      background: var(--accent);
      color: #0f172a;
      border-color: var(--accent);
    }
    .btn-copy-main {
      background: #0284c7;
      border-color: #0369a1;
      font-weight: 700;
    }
    .btn-copy-main:hover {
      background: #0ea5e9;
    }
    .copy-textarea {
      width: 100%;
      height: 160px;
      background: #090d16;
      border: none;
      color: #94a3b8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8rem;
      padding: 12px;
      resize: vertical;
      line-height: 1.4;
      display: none;
    }
    .copy-textarea.show {
      display: block;
    }

    /* Editable Styling when Edit Mode Active */
    body.edit-mode-active [data-editable="true"] {
      outline: 1px dashed rgba(245, 158, 11, 0.4);
      background: rgba(245, 158, 11, 0.05);
      border-radius: 2px;
      cursor: text;
      transition: all 0.15s ease;
    }
    body.edit-mode-active [data-editable="true"]:hover {
      outline: 1.5px solid #f59e0b;
      background: rgba(245, 158, 11, 0.15);
    }
    body.edit-mode-active [data-editable="true"]:focus {
      outline: 2px solid #38bdf8;
      background: rgba(56, 189, 248, 0.15);
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      border: 1px solid var(--accent);
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      z-index: 2000;
      animation: slideIn 0.3s ease;
    }
    .toast.active { display: flex; }
    @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @media (max-width: 900px) {
      .app-container { flex-direction: column; }
      .sidebar { width: 100%; height: auto; position: static; }
      .content-area { padding: 16px; }
      .case-header { flex-direction: column; align-items: flex-start; }
      .case-badges { width: 100%; }
      .top-toolbar { padding: 0 12px; }
      .toolbar-brand span { display: none; }
    }
  </style>
</head>
<body>

  <!-- Top Sticky Bar -->
  <header class="top-toolbar">
    <div class="toolbar-brand">
      <span style="font-size: 1.3rem;">🕵️‍♂️</span>
      <span>雙北 50 大推理案件全書規格庫</span>
      <span class="edit-status-badge" id="editStatusBadge">🟢 瀏覽模式</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn-tool btn-tool-edit" id="btnToggleEdit" onclick="toggleEditMode()" title="點擊直接修改頁面文字">
        ✏️ 開啟直接編輯模式 (點擊文字直接改)
      </button>
      <button class="btn-tool btn-tool-save" onclick="saveAllEdits()" title="儲存修改內容至瀏覽器與伺服器">
        💾 儲存修改內容
      </button>
      <button class="btn-tool btn-tool-copy-all" onclick="copyAllCasesMarkdown()" title="一鍵複製全書 50 案完整 Markdown">
        📋 複製全文
      </button>
      <button class="btn-tool" onclick="resetToDefault()" title="清除修改還原預設">
        🔄 還原官方原始設定
      </button>
      <button class="btn-tool" onclick="downloadEditedHtml()" title="下載修改後的完整靜態 HTML">
        📥 下載修改後網頁
      </button>
    </div>
  </header>

  <div class="app-container">
    <!-- Sidebar Directory -->
    <aside class="sidebar">
      <div class="sidebar-panel">
        <div class="sidebar-panel-title">💡 訪客直接修改教學</div>
        點擊頂部「<strong>✏️ 開啟直接編輯模式</strong>」，點選網頁上任何文字即可直接打字改錯！改完點擊「<strong>💾 儲存</strong>」，下次開啟或重新整理自動保留！
        <div style="margin-top: 8px; border-top: 1px dashed var(--border); padding-top: 8px;">
          <button class="btn-tool btn-tool-copy-all" style="width: 100%; justify-content: center; font-size: 0.8rem; padding: 6px 10px;" onclick="copyAllCasesMarkdown()">
            📋 一鍵複製 50 案全文
          </button>
        </div>
      </div>

      <input type="text" class="sidebar-search" id="sidebarSearch" placeholder="🔍 搜尋案名、地點、科學原理、角色..." oninput="filterCases()">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 4px;">
        <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">案件目錄 (50 宗)</span>
        <span style="font-size: 0.75rem; color: var(--accent);" id="navCaseCount">50 案</span>
      </div>

      <ul class="sidebar-nav-list" id="sidebarNavList">
""")

# Sidebar chapters
current_ch = ""
for c in all_cases:
    c_ch = c.get('chapter', '')
    if c_ch != current_ch:
        current_ch = c_ch
        html_parts.append(f"""        <li class="sidebar-chapter-heading">{html.escape(current_ch)}</li>\n""")
    html_parts.append(f"""        <li class="sidebar-nav-item" data-case-id="{c['id']}">
          <a href="#{c['id']}" class="sidebar-nav-link" title="{c['title']}">
            <strong>{c['id']}</strong> <span class="nav-title-{c['id']}">{html.escape(c['title'])}</span>
          </a>
        </li>\n""")

html_parts.append("""      </ul>
    </aside>

    <!-- Content Area -->
    <main class="content-area">
      <!-- Header Banner -->
      <header class="header-nav">
        <h1 class="header-title">📚 雙北 50 大深度推理案件全書規格庫（六年級獨立研究專題）</h1>
        <p class="header-subtitle">
          融合雙北 1:1 真實地理、百年文史事件與 108 課綱生活科學鑑識之 2.5D 都會慢活偵探 RPG。<br>
          本頁面收錄全套 50 宗案件之完整起因、經過、最後推導細節、嚴謹柯南/福爾摩斯人物誌、108 課綱 DIY 微實驗小手冊、在地老字號美食體力補給站與跨案暗線伏筆。
        </p>
        <div class="header-highlights">
          <span class="highlight-pill">✨ 50 大全案起因經過最後完整收錄</span>
          <span class="highlight-pill">🧪 108 課綱 30 秒家庭/教室 DIY 微實驗手冊</span>
          <span class="highlight-pill">🍢 雙北 50~100m 在地老字號體力補給系統</span>
          <span class="highlight-pill">🔗 都會群像跨案暗線伏筆大連鎖</span>
          <span class="highlight-pill">✏️ 線上免登入隨意改字修正</span>
          <span class="highlight-pill">📋 一鍵複製 50 案全書 Markdown</span>
        </div>
      </header>

      <!-- Filter Toolbar -->
      <div class="filter-card">
        <!-- 篇章篩選 -->
        <div class="filter-group">
          <span class="filter-label">📖 主線篇章:</span>
          <span class="filter-chip filter-chip-chapter active" onclick="setChapterFilter('all', this)">全部篇章 (50)</span>
          <span class="filter-chip filter-chip-chapter" onclick="setChapterFilter('初出茅廬', this)">第一篇：初出茅廬篇 (1~10)</span>
          <span class="filter-chip filter-chip-chapter" onclick="setChapterFilter('文史縱深', this)">第二篇：文史縱深篇 (11~25)</span>
          <span class="filter-chip filter-chip-chapter" onclick="setChapterFilter('跨區連環', this)">第三篇：跨區連環懸案篇 (26~50)</span>
        </div>

        <!-- 區域篩選 -->
        <div class="filter-group">
          <span class="filter-label">🏙️ 區域篩選:</span>
          <span class="filter-chip active" onclick="setDistrictFilter('all', this)">全部地區</span>
          <span class="filter-chip" onclick="setDistrictFilter('萬華', this)">萬華/西門</span>
          <span class="filter-chip" onclick="setDistrictFilter('中正', this)">中正/北車</span>
          <span class="filter-chip" onclick="setDistrictFilter('淡水', this)">淡水</span>
          <span class="filter-chip" onclick="setDistrictFilter('北投', this)">北投</span>
          <span class="filter-chip" onclick="setDistrictFilter('板橋', this)">板橋</span>
          <span class="filter-chip" onclick="setDistrictFilter('新莊', this)">新莊</span>
          <span class="filter-chip" onclick="setDistrictFilter('大同', this)">大稻埕/大同</span>
          <span class="filter-chip" onclick="setDistrictFilter('士林', this)">士林</span>
          <span class="filter-chip" onclick="setDistrictFilter('三重', this)">三重</span>
          <span class="filter-chip" onclick="setDistrictFilter('其他', this)">其他行政區</span>
        </div>

        <!-- 類型篩選 -->
        <div class="filter-group">
          <span class="filter-label">🏷️ 案件類型:</span>
          <span class="filter-chip active" onclick="setTypeFilter('all', this)">全部類型</span>
          <span class="filter-chip" onclick="setTypeFilter('突發案件', this)">突發案件</span>
          <span class="filter-chip" onclick="setTypeFilter('主線案件', this)">主線案件</span>
          <span class="filter-chip" onclick="setTypeFilter('個人任務', this)">個人任務</span>
          <span class="filter-chip" onclick="setTypeFilter('共享競速', this)">共享競速</span>
          <span class="filter-chip" onclick="setTypeFilter('歷史懸案', this)">歷史懸案</span>
        </div>
      </div>

      <!-- Cases Stream Header with Quick Copy -->
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 1.2rem; padding: 12px 18px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow);">
        <div>
          <span style="font-size: 1rem; font-weight: 800; color: #0f172a;">📚 雙北 50 大深度推理案件全書規格庫</span>
          <span style="font-size: 0.85rem; color: #64748b; margin-left: 8px;" id="saveIndicator">隨時可點擊「✏️ 開啟直接編輯模式」直接在網頁修改文字！</span>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn-tool btn-tool-copy-all" onclick="copyAllCasesMarkdown()" style="font-size: 0.85rem; padding: 6px 14px;">
            📋 複製全文
          </button>
          <button class="btn-tool" onclick="expandAllMarkdown()" style="color: #0f172a; border-color: #cbd5e1; font-size: 0.82rem; padding: 6px 10px;">
            📂 展開所有 Markdown
          </button>
          <button class="btn-tool" onclick="collapseAllMarkdown()" style="color: #0f172a; border-color: #cbd5e1; font-size: 0.82rem; padding: 6px 10px;">
            📁 收合所有 Markdown
          </button>
        </div>
      </div>

      <!-- Case Cards Stream -->
      <div class="cases-stream" id="casesStream">
""")

for c in all_cases:
    md_text = generate_case_markdown(c)
    escaped_md = html.escape(md_text)

    # Characters HTML
    chars_html = []
    for idx_char, char in enumerate(c['characters']):
        card_class = "character-card"
        if "真兇" in char['identity']:
            card_class += " killer"
        elif "被害" in char['identity'] or "受害" in char['identity']:
            card_class += " victim"

        chars_html.append(f"""          <div class="{card_class}" data-char-idx="{idx_char}">
            <div class="char-name">
              <span data-editable="true" data-field="char_name" oninput="handleFieldChange('{c['id']}')">{html.escape(char['name'])}</span>
              <span class="char-identity" data-editable="true" data-field="char_identity" oninput="handleFieldChange('{c['id']}')">{html.escape(char['identity'])}</span>
            </div>
            <div class="char-field"><strong>身分與作息：</strong><span data-editable="true" data-field="char_job" oninput="handleFieldChange('{c['id']}')">{html.escape(char['job_daily'])}</span></div>
            <div class="char-field"><strong>與他人關係：</strong><span data-editable="true" data-field="char_rel_others" oninput="handleFieldChange('{c['id']}')">{html.escape(char['relation_others'])}</span></div>
            <div class="char-field"><strong>與被害人關係：</strong><span data-editable="true" data-field="char_rel_victim" oninput="handleFieldChange('{c['id']}')">{html.escape(char['relation_victim'])}</span></div>
            <div class="char-field"><strong>犯罪動機：</strong><span data-editable="true" data-field="char_motive" oninput="handleFieldChange('{c['id']}')">{html.escape(char['motive'])}</span></div>
            <div class="char-field"><strong>口供陳述：</strong><em data-editable="true" data-field="char_statement" oninput="handleFieldChange('{c['id']}')">{html.escape(char['statement'])}</em></div>
            <div class="char-field char-flaw"><strong>⚠️ 破綻關鍵：</strong><span data-editable="true" data-field="char_flaw" oninput="handleFieldChange('{c['id']}')">{html.escape(char['flaw'])}</span></div>
          </div>""")

    depo = c['deposition']
    testimony = depo.get('testimony', depo.get('testimacy', ''))
    props = c['props_and_easter_egg']
    diy = c.get('diy_experiment', {})
    food = props.get('local_food', {})
    cross = c.get('cross_case_clue', {})

    html_parts.append(f"""
        <!-- Case Card: {c['id']} -->
        <article class="case-card" id="{c['id']}" data-district="{html.escape(c['district'])}" data-type="{html.escape(c['type'])}" data-chapter="{html.escape(c.get('chapter', ''))}" data-title="{html.escape(c['title'])}">
          <div class="case-header">
            <div class="case-header-left">
              <span class="case-id-badge">{c['id']}</span>
              <h2 class="case-title" data-editable="true" data-field="title" oninput="handleFieldChange('{c['id']}')">{html.escape(c['title'])}</h2>
              <span class="card-edited-tag">✏️ 已修改</span>
            </div>
            <div class="case-badges">
              <span class="badge badge-chapter">📖 <span data-editable="true" data-field="chapter" oninput="handleFieldChange('{c['id']}')">{html.escape(c.get('chapter', ''))}</span></span>
              <span class="badge badge-type">🏷️ <span data-editable="true" data-field="type" oninput="handleFieldChange('{c['id']}')">{html.escape(c['type'])}</span></span>
              <span class="badge badge-diff">難度：<span data-editable="true" data-field="difficulty" oninput="handleFieldChange('{c['id']}')">{html.escape(c['difficulty'])}</span></span>
              <span class="badge badge-spook"><span data-editable="true" data-field="spookiness" oninput="handleFieldChange('{c['id']}')">{html.escape(c['spookiness'])}</span></span>
              <span class="badge badge-location">📍 <span data-editable="true" data-field="district" oninput="handleFieldChange('{c['id']}')">{html.escape(c['district'])}</span></span>
            </div>
          </div>

          <div class="case-body">
            <!-- 1. Location & History -->
            <div class="section-block">
              <div class="section-title">🏛️ 當地歷史事件與地方風情</div>
              <div class="section-content">
                <p><strong>【精確地點】</strong><span data-editable="true" data-field="location" oninput="handleFieldChange('{c['id']}')">{html.escape(c['location'])}</span></p>
                <p data-editable="true" data-field="history_culture" oninput="handleFieldChange('{c['id']}')">{html.escape(c['history_culture'])}</p>
                <p><strong>【交通常識與生活動線】</strong><span data-editable="true" data-field="traffic_trivia" oninput="handleFieldChange('{c['id']}')">{html.escape(c['traffic_trivia'])}</span></p>
              </div>
            </div>

            <!-- 2. Science Principle -->
            <div class="section-block">
              <div class="section-title">🔬 生活科學原理與鑑識依據（108 課綱）</div>
              <div class="section-content">
                <p data-editable="true" data-field="science_principle" oninput="handleFieldChange('{c['id']}')">{html.escape(c['science_principle'])}</p>
              </div>
            </div>

            <!-- 3. Characters -->
            <div class="section-block">
              <div class="section-title">👥 嚴謹細節人物誌（動機、作息與關係網絡）</div>
              <div class="characters-grid">
{chr(10).join(chars_html)}
              </div>
            </div>

            <!-- 4. 3-Acts推導三部曲 -->
            <div class="section-block">
              <div class="section-title">📖 案情推導三部曲（起因、經過、最後）</div>
              <div class="acts-grid">
                <div class="act-box act-cause">
                  <div class="act-header">💥 起因（案發導火線與事前佈局）</div>
                  <div class="act-desc" data-editable="true" data-field="story_cause" oninput="handleFieldChange('{c['id']}')">{html.escape(c['story_cause'])}</div>
                </div>
                <div class="act-box act-process">
                  <div class="act-header">🔍 經過（現場勘驗、嫌犯對質與線索交織）</div>
                  <div class="act-desc" data-editable="true" data-field="story_process" oninput="handleFieldChange('{c['id']}')">{html.escape(c['story_process'])}</div>
                </div>
                <div class="act-box act-climax">
                  <div class="act-header">⚡ 最後（科學鐵證打臉與真兇落網伏法）</div>
                  <div class="act-desc" data-editable="true" data-field="story_climax" oninput="handleFieldChange('{c['id']}')">{html.escape(c['story_climax'])}</div>
                </div>
              </div>
            </div>

            <!-- 5. Deposition -->
            <div class="section-block">
              <div class="section-title">⚖️ 官方警訊偵查筆錄</div>
              <div class="depo-box">
                <div class="depo-item"><strong>筆錄編號：</strong><span data-editable="true" data-field="depo_record_id" oninput="handleFieldChange('{c['id']}')">{html.escape(depo.get('record_id', ''))}</span></div>
                <div class="depo-item"><strong>承辦警官：</strong><span data-editable="true" data-field="depo_officer" oninput="handleFieldChange('{c['id']}')">{html.escape(depo.get('officer', ''))}</span></div>
                <div class="depo-item"><strong>受訊人：</strong><span data-editable="true" data-field="depo_interrogee" oninput="handleFieldChange('{c['id']}')">{html.escape(depo.get('interrogee', ''))}</span></div>
                <div class="depo-item"><strong>受訊陳述：</strong><em data-editable="true" data-field="depo_testimony" oninput="handleFieldChange('{c['id']}')">{html.escape(testimony)}</em></div>
                <div class="depo-item"><strong>矛盾破綻：</strong><span data-editable="true" data-field="depo_contradiction" oninput="handleFieldChange('{c['id']}')">{html.escape(depo.get('contradiction', ''))}</span></div>
                <div class="depo-item"><strong>關鍵鐵證：</strong><span style="color:#4ade80; font-weight:700;" data-editable="true" data-field="depo_evidence" oninput="handleFieldChange('{c['id']}')">{html.escape(depo.get('critical_evidence', ''))}</span></div>
              </div>
            </div>

            <!-- 6. Props & Easter Egg -->
            <div class="section-block">
              <div class="section-title">🎒 破案輔助道具三軌與鄰近彩蛋</div>
              <div class="props-grid">
                <div class="prop-item">
                  <strong>💰 金錢購買途徑</strong><br>
                  <span data-editable="true" data-field="prop_money" oninput="handleFieldChange('{c['id']}')">{html.escape(props.get('prop_money', ''))}</span>
                </div>
                <div class="prop-item">
                  <strong>🏛️ 親身探索途徑</strong><br>
                  <span data-editable="true" data-field="prop_explore" oninput="handleFieldChange('{c['id']}')">{html.escape(props.get('prop_explore', ''))}</span>
                </div>
                <div class="prop-item">
                  <strong>🤝 社交打聽途徑</strong><br>
                  <span data-editable="true" data-field="prop_social" oninput="handleFieldChange('{c['id']}')">{html.escape(props.get('prop_social', ''))}</span>
                </div>
                <div class="prop-item">
                  <strong>🥚 鄰近文化彩蛋</strong><br>
                  <span data-editable="true" data-field="prop_egg" oninput="handleFieldChange('{c['id']}')">{html.escape(props.get('easter_egg', ''))}</span>
                </div>
              </div>
            </div>

            <!-- 7. ★ 六年級 108 課綱 DIY 微實驗小手冊 -->
            <div class="section-block">
              <div class="section-title">🧫 六年級 108 課綱生活 DIY 微實驗小手冊（30 秒家庭/教室動手做）</div>
              <div class="diy-experiment-box">
                <div class="diy-header">
                  <span class="diy-title" data-editable="true" data-field="diy_title" oninput="handleFieldChange('{c['id']}')">🔬 {html.escape(diy.get('title', ''))}</span>
                  <span class="diy-tag">安全無毒微實驗</span>
                </div>
                <div class="diy-field"><strong>準備材料（30秒隨手取得）：</strong><span data-editable="true" data-field="diy_materials" oninput="handleFieldChange('{c['id']}')">{html.escape(diy.get('materials', ''))}</span></div>
                <div class="diy-field"><strong>操作步驟：</strong><span data-editable="true" data-field="diy_steps" oninput="handleFieldChange('{c['id']}')">{html.escape(diy.get('steps', ''))}</span></div>
                <div class="diy-science">
                  <strong>💡 課綱生活科學解密：</strong><span data-editable="true" data-field="diy_science" oninput="handleFieldChange('{c['id']}')">{html.escape(diy.get('science_explained', ''))}</span>
                </div>
              </div>
            </div>

            <!-- 8. ★ 雙北在地老字號特產小吃生活補給 -->
            <div class="section-block">
              <div class="section-title">🍢 雙北 50~100m 在地老字號體力補給站</div>
              <div class="local-food-box">
                <div class="food-header">
                  <span class="food-name" data-editable="true" data-field="food_name" oninput="handleFieldChange('{c['id']}')">🍲 {html.escape(food.get('name', ''))}</span>
                  <span class="food-hp-tag" data-editable="true" data-field="food_effect" oninput="handleFieldChange('{c['id']}')">{html.escape(food.get('effect', ''))}</span>
                </div>
                <div class="food-loc"><strong>📍 補給位置：</strong><span data-editable="true" data-field="food_location" oninput="handleFieldChange('{c['id']}')">{html.escape(food.get('location', ''))}</span></div>
                <div class="food-desc" data-editable="true" data-field="food_desc" oninput="handleFieldChange('{c['id']}')">{html.escape(food.get('desc', ''))}</div>
              </div>
            </div>

            <!-- 9. ★ 都會群像跨案人物與物證暗線伏筆 -->
            <div class="section-block">
              <div class="section-title">🔗 都會群像跨案暗線伏筆（雙北連環謎網）</div>
              <div class="cross-clue-box">
                <div class="cross-header">
                  <span class="cross-title" data-editable="true" data-field="cross_title" oninput="handleFieldChange('{c['id']}')">{html.escape(cross.get('clue_title', ''))}</span>
                  <div class="cross-tags">
                    <span class="cross-badge" data-editable="true" data-field="cross_related" oninput="handleFieldChange('{c['id']}')">聯動：{html.escape(', '.join(cross.get('related_cases', [])))}</span>
                  </div>
                </div>
                <div class="cross-desc" data-editable="true" data-field="cross_desc" oninput="handleFieldChange('{c['id']}')">{html.escape(cross.get('description', ''))}</div>
              </div>
            </div>

            <!-- 10. Copy Markdown Section -->
            <div class="markdown-copy-area">
              <div class="markdown-copy-header">
                <span class="copy-title">📋 本案規格 Markdown 原始碼（直接複製即可貼上至企劃書）</span>
                <div class="copy-actions">
                  <button class="btn-copy btn-copy-main" onclick="copyCaseMarkdown('{c['id']}')">
                    📋 複製本案完整設定
                  </button>
                  <button class="btn-copy" onclick="toggleMarkdown('{c['id']}')">
                    👁️ 檢視/收合原始碼
                  </button>
                </div>
              </div>
              <textarea class="copy-textarea" id="md_{c['id']}" readonly>{escaped_md}</textarea>
            </div>
          </div>
        </article>""")

html_parts.append("""      </div>
    </main>
  </div>

  <!-- Toast Notification -->
  <div class="toast" id="toast">✅ 已成功複製到剪貼簿！</div>

  <!-- Interactive Script -->
  <script>
    // Edit Mode State
    let isEditMode = false;
    const STORAGE_KEY = 'shuangbei_cases_custom_edits_v2';

    function toggleEditMode() {
      isEditMode = !isEditMode;
      document.body.classList.toggle('edit-mode-active', isEditMode);
      
      const btn = document.getElementById('btnToggleEdit');
      const badge = document.getElementById('editStatusBadge');
      const indicator = document.getElementById('saveIndicator');

      document.querySelectorAll('[data-editable="true"]').forEach(el => {
        el.contentEditable = isEditMode ? 'true' : 'false';
      });

      if (isEditMode) {
        btn.textContent = '🔒 退出編輯模式 (儲存變更)';
        btn.style.background = '#10b981';
        btn.style.color = '#ffffff';
        badge.textContent = '🟡 編輯模式進行中';
        badge.classList.add('active');
        indicator.textContent = '直接點選下方任何文字即可打字改錯！修改完成請點儲存。';
        showToast('✏️ 已開啟直接編輯模式！點擊任何文字即可打字修改！');
      } else {
        btn.textContent = '✏️ 開啟直接編輯模式 (點擊文字直接改)';
        btn.style.background = '#f59e0b';
        btn.style.color = '#0f172a';
        badge.textContent = '🟢 瀏覽模式';
        badge.classList.remove('active');
        indicator.textContent = '隨時可點擊「✏️ 開啟直接編輯模式」直接在網頁修改文字！';
        saveAllEdits();
      }
    }

    // Auto-update Card Markdown on Field Change
    function handleFieldChange(caseId) {
      const card = document.getElementById(caseId);
      if (!card) return;

      card.classList.add('is-edited');
      reconstructCardMarkdown(card, caseId);
    }

    function reconstructCardMarkdown(card, caseId) {
      const getVal = (field) => {
        const el = card.querySelector(`[data-field="${field}"]`);
        return el ? el.innerText.trim() : '';
      };

      const title = getVal('title');
      const chapter = getVal('chapter');
      const type = getVal('type');
      const difficulty = getVal('difficulty');
      const spookiness = getVal('spookiness');
      const district = getVal('district');
      const location = getVal('location');
      const history_culture = getVal('history_culture');
      const traffic_trivia = getVal('traffic_trivia');
      const science_principle = getVal('science_principle');
      const story_cause = getVal('story_cause');
      const story_process = getVal('story_process');
      const story_climax = getVal('story_climax');
      const depo_record_id = getVal('depo_record_id');
      const depo_officer = getVal('depo_officer');
      const depo_interrogee = getVal('depo_interrogee');
      const depo_testimony = getVal('depo_testimony');
      const depo_contradiction = getVal('depo_contradiction');
      const depo_evidence = getVal('depo_evidence');
      const prop_money = getVal('prop_money');
      const prop_explore = getVal('prop_explore');
      const prop_social = getVal('prop_social');
      const prop_egg = getVal('prop_egg');

      const diy_title = getVal('diy_title');
      const diy_materials = getVal('diy_materials');
      const diy_steps = getVal('diy_steps');
      const diy_science = getVal('diy_science');

      const food_name = getVal('food_name');
      const food_effect = getVal('food_effect');
      const food_location = getVal('food_location');
      const food_desc = getVal('food_desc');

      const cross_title = getVal('cross_title');
      const cross_related = getVal('cross_related');
      const cross_desc = getVal('cross_desc');

      // Update Nav title if changed
      const navTitleEl = document.querySelector(`.nav-title-${caseId}`);
      if (navTitleEl && title) navTitleEl.textContent = title;

      // Characters Markdown
      const charCards = card.querySelectorAll('.character-card');
      const charsMd = [];
      charCards.forEach(cCard => {
        const cName = cCard.querySelector('[data-field="char_name"]')?.innerText.trim() || '';
        const cIden = cCard.querySelector('[data-field="char_identity"]')?.innerText.trim() || '';
        const cJob = cCard.querySelector('[data-field="char_job"]')?.innerText.trim() || '';
        const cRelO = cCard.querySelector('[data-field="char_rel_others"]')?.innerText.trim() || '';
        const cRelV = cCard.querySelector('[data-field="char_rel_victim"]')?.innerText.trim() || '';
        const cMot = cCard.querySelector('[data-field="char_motive"]')?.innerText.trim() || '';
        const cStat = cCard.querySelector('[data-field="char_statement"]')?.innerText.trim() || '';
        const cFlaw = cCard.querySelector('[data-field="char_flaw"]')?.innerText.trim() || '';

        charsMd.push(`### 👤 ${cName}（${cIden}）
- **職業身分與生活作息**：${cJob}
- **與他人關係**：${cRelO}
- **與被害人關係**：${cRelV}
- **犯罪動機分析**：${cMot}
- **口供陳述**：${cStat}
- **破綻與打臉關鍵**：${cFlaw}`);
      });

      const md = `# 【${caseId}】${title}
- **所屬篇章**：${chapter}
- **案件類型**：${type}
- **難度星級**：${difficulty}
- **驚悚指數**：${spookiness}
- **案發地點**：${location}（${district}）

## 🏛️ 當地歷史事件與地方風情
${history_culture}
- **交通常識與生活動線**：${traffic_trivia}

## 🔬 生活科學原理與鑑識依據（108 課綱）
${science_principle}

## 👥 嚴謹細節人物誌
${charsMd.join('\\n\\n')}

## 📖 案情推導三部曲
### 【起因】
${story_cause}

### 【經過】
${story_process}

### 【最後】
${story_climax}

## ⚖️ 官方警訊偵查筆錄
- **筆錄編號**：${depo_record_id}
- **承辦人員**：${depo_officer}
- **受訊人**：${depo_interrogee}
- **受訊供述**：${depo_testimony}
- **矛盾破綻**：${depo_contradiction}
- **關鍵鐵證**：${depo_evidence}

## 🎒 破案輔助道具三軌與鄰近彩蛋
- **💰 金錢購買途徑**：${prop_money}
- **🏛️ 親身探索途徑**：${prop_explore}
- **🤝 社交打聽途徑**：${prop_social}
- **🥚 鄰近文化彩蛋**：${prop_egg}

## 🧫 六年級 108 課綱生活 DIY 微實驗小手冊
- **微實驗名稱**：${diy_title}
- **準備材料**：${diy_materials}
- **操作步驟**：${diy_steps}
- **課綱科學解密**：${diy_science}

## 🍢 雙北 50~100m 在地老字號體力補給站
- **推薦名店**：${food_name}（${food_location}）
- **食用效果**：${food_effect}
- **美食特色與文史背景**：${food_desc}

## 🔗 都會群像跨案暗線伏筆
- **關聯案件**：${cross_related}
- **伏筆標題**：${cross_title}
- **暗線詳情**：${cross_desc}`;

      const textarea = document.getElementById('md_' + caseId);
      if (textarea) textarea.value = md;
    }

    // Save All Edits to LocalStorage & Try Server Sync
    function saveAllEdits() {
      const edits = {};
      let editedCount = 0;

      document.querySelectorAll('.case-card.is-edited').forEach(card => {
        const caseId = card.id;
        const fields = {};
        card.querySelectorAll('[data-field]').forEach(el => {
          const key = el.getAttribute('data-field');
          fields[key] = el.innerHTML;
        });
        edits[caseId] = fields;
        editedCount++;
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }

      // Try server-side persistence if server.js is running
      const fullHtml = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
      fetch('/api/save-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: fullHtml })
      }).then(r => r.json()).then(res => {
        if (res.success) {
          showToast(`💾 儲存成功！已同步寫入伺服器與瀏覽器！`);
        } else {
          showToast(`💾 已儲存！修改已保存在您的本機瀏覽器中！`);
        }
      }).catch(() => {
        showToast(`💾 已儲存！修改已保存在您的本機瀏覽器中（重新整理不消失）！`);
      });
    }

    // Restore Edits on Load
    function restoreSavedEdits() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const edits = JSON.parse(saved);
        let count = 0;

        for (const [caseId, fields] of Object.entries(edits)) {
          const card = document.getElementById(caseId);
          if (!card) continue;
          card.classList.add('is-edited');
          count++;

          for (const [key, val] of Object.entries(fields)) {
            const el = card.querySelector(`[data-field="${key}"]`);
            if (el) el.innerHTML = val;
          }
          reconstructCardMarkdown(card, caseId);
        }

        if (count > 0) {
          showToast(`📝 已自動還原您先前的 ${count} 項自訂修改！`);
        }
      } catch (e) {
        console.warn('Restore edits error:', e);
      }
    }

    // Reset to Default
    function resetToDefault() {
      if (!confirm('確定要清除所有自訂修改，還原為官方預設版本嗎？')) return;
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }

    // Download Edited HTML
    function downloadEditedHtml() {
      // Temporarily exit edit mode for clean DOM
      const wasEdit = isEditMode;
      if (wasEdit) toggleEditMode();

      const blob = new Blob(['<!DOCTYPE html>\\n' + document.documentElement.outerHTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cases_edited.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('📥 已成功下載修改後的完整網頁檔案 (cases_edited.html)！');

      if (wasEdit) toggleEditMode();
    }

    // Copy Single Case Markdown
    function copyCaseMarkdown(caseId) {
      const textarea = document.getElementById('md_' + caseId);
      if (!textarea) return;

      const text = textarea.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showToast(`📋✅ 已成功複製【${caseId}】完整 Markdown 設定！`);
        }).catch(() => {
          fallbackCopyText(text, `📋✅ 已成功複製【${caseId}】完整 Markdown 設定！`);
        });
      } else {
        fallbackCopyText(text, `📋✅ 已成功複製【${caseId}】完整 Markdown 設定！`);
      }
    }

    // Copy All 50 Cases Full Text Markdown
    function copyAllCasesMarkdown() {
      const cards = document.querySelectorAll('.case-card');
      const allMds = [];

      allMds.push(`# 《雙北漫遊：都會行蹤》50 大歷史風情與生活科學案件全集（六年級獨立研究專題）\\n\\n> 本全書規格庫收錄雙北 50 宗原創推理大案，涵蓋三大主線篇章、柯南/福爾摩斯人物誌、推導三部曲、108 課綱 DIY 微實驗小手冊、雙北在地老字號美食體力補給與都會群像跨案暗線伏筆。\\n\\n---\\n`);

      cards.forEach(card => {
        const caseId = card.id;
        const textarea = document.getElementById('md_' + caseId);
        if (textarea && textarea.value.trim()) {
          allMds.push(textarea.value.trim());
        }
      });

      const fullText = allMds.join('\\n\\n---\\n\\n');

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullText).then(() => {
          showToast('📋✅ 已成功複製全站 50 案完整全文（含即時修改）至剪貼簿！');
        }).catch(() => {
          fallbackCopyText(fullText, '📋✅ 已成功複製全站 50 案完整全文！');
        });
      } else {
        fallbackCopyText(fullText, '📋✅ 已成功複製全站 50 案完整全文！');
      }
    }

    function fallbackCopyText(text, successMsg) {
      const dummy = document.createElement('textarea');
      dummy.value = text;
      dummy.style.position = 'fixed';
      dummy.style.top = '0';
      dummy.style.left = '-9999px';
      dummy.style.opacity = '0';
      document.body.appendChild(dummy);
      dummy.focus();
      dummy.select();
      try {
        const ok = document.execCommand('copy');
        if (ok) {
          showToast(successMsg || '📋✅ 複製成功！');
        } else {
          showToast('❌ 瀏覽器限制，請點擊各案展開手動複製！');
        }
      } catch (e) {
        showToast('❌ 複製失敗，請手動複製！');
      }
      document.body.removeChild(dummy);
    }

    function toggleMarkdown(caseId) {
      const textarea = document.getElementById('md_' + caseId);
      if (!textarea) return;
      textarea.classList.toggle('show');
    }

    function expandAllMarkdown() {
      document.querySelectorAll('.copy-textarea').forEach(el => el.classList.add('show'));
      showToast('📂 已全部展開所有案件 Markdown 框！');
    }

    function collapseAllMarkdown() {
      document.querySelectorAll('.copy-textarea').forEach(el => el.classList.remove('show'));
      showToast('📁 已全部收合所有案件 Markdown 框！');
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.add('active');
      setTimeout(() => {
        toast.classList.remove('active');
      }, 3000);
    }

    // Filter Logic
    let currentChapter = 'all';
    let currentDistrict = 'all';
    let currentType = 'all';

    function setChapterFilter(chapter, chip) {
      currentChapter = chapter;
      document.querySelectorAll('.filter-group:nth-child(1) .filter-chip').forEach(el => el.classList.remove('active'));
      chip.classList.add('active');
      applyFilters();
    }

    function setDistrictFilter(district, chip) {
      currentDistrict = district;
      document.querySelectorAll('.filter-group:nth-child(2) .filter-chip').forEach(el => el.classList.remove('active'));
      chip.classList.add('active');
      applyFilters();
    }

    function setTypeFilter(type, chip) {
      currentType = type;
      document.querySelectorAll('.filter-group:nth-child(3) .filter-chip').forEach(el => el.classList.remove('active'));
      chip.classList.add('active');
      applyFilters();
    }

    function filterCases() {
      applyFilters();
    }

    function applyFilters() {
      const query = (document.getElementById('sidebarSearch')?.value || '').toLowerCase().trim();
      const cards = document.querySelectorAll('.case-card');
      const sidebarLinks = document.querySelectorAll('.sidebar-nav-item');
      let visibleCount = 0;

      cards.forEach((card, index) => {
        const cChapter = card.getAttribute('data-chapter') || '';
        const cDistrict = card.getAttribute('data-district') || '';
        const cType = card.getAttribute('data-type') || '';
        const cTitle = card.getAttribute('data-title') || '';
        const cId = card.id || '';
        const cardText = card.textContent.toLowerCase();

        let chapterMatch = (currentChapter === 'all') || cChapter.includes(currentChapter);
        let districtMatch = (currentDistrict === 'all') || cDistrict.includes(currentDistrict);
        let typeMatch = (currentType === 'all') || (cType === currentType);
        let searchMatch = true;

        if (query) {
          searchMatch = cId.toLowerCase().includes(query) ||
                        cTitle.toLowerCase().includes(query) ||
                        cDistrict.toLowerCase().includes(query) ||
                        cChapter.toLowerCase().includes(query) ||
                        cardText.includes(query);
        }

        const isVisible = chapterMatch && districtMatch && typeMatch && searchMatch;
        card.style.display = isVisible ? 'block' : 'none';

        if (sidebarLinks[index]) {
          sidebarLinks[index].style.display = isVisible ? 'block' : 'none';
        }

        if (isVisible) visibleCount++;
      });

      const countEl = document.getElementById('navCaseCount');
      if (countEl) countEl.textContent = visibleCount + ' 案';
    }

    // Auto run on load
    window.addEventListener('DOMContentLoaded', () => {
      restoreSavedEdits();
    });
  </script>
</body>
</html>
""")

full_html = "".join(html_parts)

with open('cases.html', 'w', encoding='utf-8') as f:
    f.write(full_html)

print(f"Successfully generated cases.html with interactive in-place editor! Size: {len(full_html)} bytes.")
