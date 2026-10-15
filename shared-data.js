/**
 * ============================================================================
 * NEO-TAIPEI HOLO-GRID 雙軌單一資料源 (SSOT - Single Source of Truth)
 * 供主檔 (game.js) ✕ 附檔 (cyber-realmap.js) ✕ 評審簡報共同調用
 * 包含：雙北 41 行政特區 ✕ 萬家福與樂家康實體門市 ✕ 10 大生活科學示範案
 * ============================================================================
 */

// ──────────────────────────────────────────
// 1. 雙北全境 41 行政特區 (12 臺北市 + 29 新北市) 統一幾何拓撲
// ──────────────────────────────────────────
const SHUANGBEI_41_SECTORS = [
  // ── 臺北市 12 核心行政特區 ──
  { id: 'TPE-01', code: 'TPE-CC', name: '中正特區・核心樞紐', lon: 121.518, lat: 25.032, x: 0, z: 20, w: 95, h: 80, col: '#00f0ff', tier: 'A', desc: '政治中樞・台北車站・站前商圈 ✕ 古蹟群' },
  { id: 'TPE-02', code: 'TPE-WH', name: '萬華特區・西門霓虹', lon: 121.498, lat: 25.035, x: -150, z: 45, w: 85, h: 80, col: '#f472b6', tier: 'A', desc: '西門町徒步區 ✕ 龍山寺 ✕ 華江跨河中繼' },
  { id: 'TPE-03', code: 'TPE-DT', name: '大同特區・大稻埕港', lon: 121.513, lat: 25.063, x: -110, z: -110, w: 80, h: 95, col: '#fbbf24', tier: 'B', desc: '迪化老街 ✕ 寧夏夜市 ✕ 大稻埕水岸碼頭' },
  { id: 'TPE-04', code: 'TPE-ZS', name: '中山特區・金融廊道', lon: 121.533, lat: 25.068, x: 90, z: -70, w: 95, h: 95, col: '#a78bfa', tier: 'A', desc: '南京中山商圈 ✕ 晴光市場 ✕ 松江條通' },
  { id: 'TPE-05', code: 'TPE-DA', name: '大安特區・森林穹頂', lon: 121.543, lat: 25.026, x: 110, z: 80, w: 85, h: 90, col: '#34d399', tier: 'A', desc: '大安森林公園 ✕ 台大師大 ✕ 敦南林蔭' },
  { id: 'TPE-06', code: 'TPE-XY', name: '信義特區・101星港', lon: 121.568, lat: 25.033, x: 235, z: 50, w: 90, h: 85, col: '#f59e0b', tier: 'S', desc: '台北101高塔 ✕ 世貿展館 ✕ 象山星港' },
  { id: 'TPE-07', code: 'TPE-SS', name: '松山特區・光子核心', lon: 121.558, lat: 25.059, x: 220, z: -85, w: 80, h: 75, col: '#fb7185', tier: 'B', desc: '松山機場 ✕ 台北小巨蛋 ✕ 饒河街觀光夜市' },
  { id: 'TPE-08', code: 'TPE-NH', name: '內湖特區・科技園區', lon: 121.589, lat: 25.083, x: 270, z: -160, w: 120, h: 90, col: '#38bdf8', tier: 'A', desc: '內科高能園區 ✕ 碧湖水岸 ✕ 大賣場旗艦聚落' },
  { id: 'TPE-09', code: 'TPE-NG', name: '南港特區・生技光谷', lon: 121.606, lat: 25.055, x: 370, z: -60, w: 100, h: 85, col: '#818cf8', tier: 'A', desc: '南港展覽館 ✕ 軟體光谷 ✕ 三鐵共構轉運樞紐' },
  { id: 'TPE-10', code: 'TPE-SL', name: '士林特區・夜市矩陣', lon: 121.524, lat: 25.093, x: -60, z: -210, w: 110, h: 90, col: '#f43f5e', tier: 'B', desc: '士林夜市 ✕ 故宮博物院 ✕ 天母國際特區' },
  { id: 'TPE-11', code: 'TPE-BT', name: '北投特區・地熱能量', lon: 121.501, lat: 25.132, x: -160, z: -270, w: 105, h: 90, col: '#c084fc', tier: 'B', desc: '地熱溫泉能量谷 ✕ 關渡水鳥濕地 ✕ 大屯火山群' },
  { id: 'TPE-12', code: 'TPE-WS', name: '文山特區・貓空生態', lon: 121.570, lat: 24.998, x: 170, z: 230, w: 110, h: 100, col: '#10b981', tier: 'C', desc: '木柵動物園 ✕ 貓空纜車茶山 ✕ 景美溪綠帶' },

  // ── 新北市 29 全境行政特區 ──
  { id: 'NTP-01', code: 'NTP-BQ', name: '板橋特區・新北總部 (學府1:1)', lon: 121.459, lat: 25.011, x: -130, z: 155, w: 100, h: 95, col: '#34d399', tier: 'S', desc: '新北市行政大樓 ✕ 學府路 1:1 真實商圈 ✕ 府中' },
  { id: 'NTP-02', code: 'NTP-SC', name: '三重特區・重新工坊', lon: 121.498, lat: 25.062, x: -260, z: -40, w: 90, h: 85, col: '#38bdf8', tier: 'A', desc: '三重重新路幹道 ✕ 台北橋水岸 ✕ 三和夜市' },
  { id: 'NTP-03', code: 'NTP-LZ', name: '蘆洲特區・微風水岸', lon: 121.473, lat: 25.084, x: -250, z: -160, w: 85, h: 80, col: '#22d3ee', tier: 'B', desc: '湧蓮寺商圈 ✕ 蘆洲機廠 ✕ 微風運河休閒帶' },
  { id: 'NTP-04', code: 'NTP-XZ', name: '新莊特區・創新高地', lon: 121.442, lat: 25.036, x: -310, z: 80, w: 100, h: 90, col: '#a3e635', tier: 'A', desc: '新莊副都心高塔 ✕ 輔仁大學 ✕ 廟街文化廊帶' },
  { id: 'NTP-05', code: 'NTP-ZH', name: '中和特區・高密量子', lon: 121.499, lat: 24.999, x: -35, z: 175, w: 80, h: 80, col: '#c084fc', tier: 'A', desc: '遠東世紀科技園 ✕ 景安雙捷運 ✕ 烘爐地' },
  { id: 'NTP-06', code: 'NTP-YH', name: '永和特區・迷宮水岸', lon: 121.513, lat: 25.008, x: -65, z: 135, w: 65, h: 65, col: '#e879f9', tier: 'A', desc: '頂溪密集街廓 ✕ 樂華夜市 ✕ 仁愛綠寶石水岸' },
  { id: 'NTP-07', code: 'NTP-TC', name: '土城特區・能源晶谷', lon: 121.443, lat: 24.972, x: -120, z: 250, w: 90, h: 90, col: '#2dd4bf', tier: 'B', desc: '土城科技園區 ✕ 頂埔高科技 ✕ 承天禪寺綠境' },
  { id: 'NTP-08', code: 'NTP-SL', name: '樹林特區・鐵道機廠', lon: 121.425, lat: 24.991, x: -220, z: 240, w: 85, h: 85, col: '#4ade80', tier: 'C', desc: '樹林車站調車場 ✕ 柑園生態園 ✕ 大同山步道' },
  { id: 'NTP-09', code: 'NTP-YG', name: '鶯歌特區・奈米陶瓷', lon: 121.354, lat: 24.954, x: -330, z: 310, w: 85, h: 85, col: '#f472b6', tier: 'C', desc: '鶯歌陶瓷博物館 ✕ 老街科技工坊 ✕ 三鶯線水岸' },
  { id: 'NTP-10', code: 'NTP-SX', name: '三峽特區・古風光谷', lon: 121.369, lat: 24.934, x: -260, z: 320, w: 95, h: 95, col: '#fb923c', tier: 'C', desc: '三峽清水祖師廟 ✕ 民權老街 ✕ 鳶山能源陣列' },
  { id: 'NTP-11', code: 'NTP-XD', name: '新店特區・碧潭水電', lon: 121.541, lat: 24.968, x: 80, z: 270, w: 110, h: 100, col: '#06b6d4', tier: 'A', desc: '碧潭水能基地 ✕ 大坪林科技商圈 ✕ 烏來隘口' },
  { id: 'NTP-12', code: 'NTP-TS', name: '淡水特區・數位水能港', lon: 121.441, lat: 25.169, x: -230, z: -330, w: 105, h: 95, col: '#00f0ff', tier: 'B', desc: '金色水岸老街 ✕ 漁人碼頭 ✕ 淡海輕軌科技城' },
  { id: 'NTP-13', code: 'NTP-BL', name: '八里特區・光能左岸', lon: 121.398, lat: 25.147, x: -310, z: -300, w: 90, h: 85, col: '#38bdf8', tier: 'C', desc: '八里渡船頭 ✕ 台北港深水物流 ✕ 十三行遺址' },
  { id: 'NTP-14', code: 'NTP-WG', name: '五股特區・綠能樞紐', lon: 121.438, lat: 25.083, x: -310, z: -80, w: 85, h: 80, col: '#10b981', tier: 'B', desc: '新北產業園區 ✕ 五股水碓 ✕ 觀音山前緣生態' },
  { id: 'NTP-15', code: 'NTP-TS2', name: '泰山特區・貴子光軌', lon: 121.431, lat: 25.059, x: -340, z: 0, w: 80, h: 75, col: '#60a5fa', tier: 'C', desc: '明志科技廊帶 ✕ 機場捷運中繼 ✕ 貴子坑親水' },
  { id: 'NTP-16', code: 'NTP-LK', name: '林口特區・台地星雲', lon: 121.391, lat: 25.077, x: -380, z: -180, w: 110, h: 95, col: '#facc15', tier: 'A', desc: '影視國際光谷 ✕ 三井聚落 ✕ 霧都台地綠網' },
  { id: 'NTP-17', code: 'NTP-XZ2', name: '汐止特區・雲端運算', lon: 121.655, lat: 25.064, x: 390, z: -30, w: 105, h: 90, col: '#818cf8', tier: 'A', desc: '大同路軟體園區 ✕ 汐科站 ✕ 基隆河科技水廊' },
  { id: 'NTP-18', code: 'NTP-SK', name: '深坑特區・豆腐光廊', lon: 121.616, lat: 25.002, x: 250, z: 210, w: 80, h: 80, col: '#4ade80', tier: 'C', desc: '深坑老街 ✕ 景美溪上游水域 ✕ 炮子崙古道' },
  { id: 'NTP-19', code: 'NTP-SD', name: '石碇特區・高嶺中繼', lon: 121.658, lat: 24.991, x: 330, z: 260, w: 85, h: 85, col: '#a78bfa', tier: 'C', desc: '石碇吊腳樓 ✕ 千島湖水源 ✕ 北宜科技中繼' },
  { id: 'NTP-20', code: 'NTP-PL', name: '坪林特區・包種光學', lon: 121.711, lat: 24.937, x: 370, z: 330, w: 90, h: 90, col: '#34d399', tier: 'C', desc: '坪林茶業博物館 ✕ 北勢溪水源保護 ✕ 雪山前哨' },
  { id: 'NTP-21', code: 'NTP-SZ', name: '三芝特區・櫻色光廊', lon: 121.501, lat: 25.258, x: -290, z: -410, w: 90, h: 80, col: '#06b6d4', tier: 'C', desc: '淺水灣海景 ✕ 飛碟屋水岸 ✕ 北海岸藝術聚落' },
  { id: 'NTP-22', code: 'NTP-SM', name: '石門特區・極北風能', lon: 121.568, lat: 25.290, x: -220, z: -450, w: 90, h: 80, col: '#38bdf8', tier: 'C', desc: '富貴角燈塔極北點 ✕ 石門風力發電陣列 ✕ 老梅石槽' },
  { id: 'NTP-23', code: 'NTP-JS', name: '金山特區・北海巨浪', lon: 121.642, lat: 25.222, x: -150, z: -420, w: 95, h: 85, col: '#0284c7', tier: 'C', desc: '金山老街 ✕ 燭臺雙嶼 ✕ 硫磺溫泉海岸' },
  { id: 'NTP-24', code: 'NTP-WL', name: '萬里特區・野柳光岩', lon: 121.689, lat: 25.176, x: 70, z: -420, w: 95, h: 85, col: '#00f0ff', tier: 'C', desc: '野柳女王頭奇岩地質 ✕ 翡翠灣星港 ✕ 北海岸公路' },
  { id: 'NTP-25', code: 'NTP-RF', name: '瑞芳特區・黃金礦嶺', lon: 121.810, lat: 25.108, x: 480, z: -60, w: 95, h: 90, col: '#fbbf24', tier: 'B', desc: '九份全息山城 ✕ 金瓜石黃金山脈 ✕ 猴硐貓村' },
  { id: 'NTP-26', code: 'NTP-PX', name: '平溪特區・天燈光子', lon: 121.738, lat: 25.025, x: 430, z: 160, w: 85, h: 85, col: '#f472b6', tier: 'C', desc: '十分大瀑布 ✕ 平溪老街鐵道 ✕ 全息光子天燈' },
  { id: 'NTP-27', code: 'NTP-SX2', name: '雙溪特區・清流綠境', lon: 121.865, lat: 25.034, x: 490, z: 220, w: 85, h: 85, col: '#22c55e', tier: 'C', desc: '雙溪低碳示範特區 ✕ 虎豹潭 ✕ 牡丹古道森林' },
  { id: 'NTP-28', code: 'NTP-GL', name: '貢寮特區・極東海洋', lon: 121.908, lat: 25.014, x: 560, z: 210, w: 90, h: 90, col: '#38bdf8', tier: 'C', desc: '三貂角燈塔極東陣列 ✕ 福隆海水浴場 ✕ 洋流發電基地' },
  { id: 'NTP-29', code: 'NTP-UL', name: '烏來特區・地熱深境', lon: 121.550, lat: 24.865, x: 110, z: 380, w: 120, h: 100, col: '#2dd4bf', tier: 'C', desc: '烏來瀑布 ✕ 地熱溫泉深境 ✕ 泰雅高山生態園區' }
];

// ──────────────────────────────────────────
// 2. 雙北實體門市資料庫 (萬家福 ✕ 樂家康 ✕ 便利超商)
// ──────────────────────────────────────────
const REAL_WORLD_STORES = [
  // ── 家樂福 (Carrefour Mega Mall) 大賣場旗艦 ──
  { id: 'wjf_01', brand: 'wanjiafu', name: '家樂福 (桂林旗艦店 24H量販)', lon: 121.5064, lat: 25.0381, x: -140, z: 95, addr: '萬華區桂林路 1 號 (24H量販)', category: '量販大賣場', supply: '家樂福高能複合能量餐包 ($40)、離子電解水 ($30)、探勘工具箱 ($150)' },
  { id: 'wjf_02', brand: 'wanjiafu', name: '家樂福 (重慶旗艦店)', lon: 121.5132, lat: 25.0594, x: -100, z: -115, addr: '大同區重慶北路二段 171 號', category: '量販大賣場', supply: '全像探測補給箱 ($120)、家樂福能量麵包 ($35)、強效濾光手電筒 ($90)' },
  { id: 'wjf_03', brand: 'wanjiafu', name: '家樂福 (新店旗艦店)', lon: 121.5452, lat: 24.9783, x: 75, z: 260, addr: '新店區中興路三段 1 號', category: '量販大賣場', supply: '高容量離子電池 ($80)、複合軍規水瓶 ($50)、水質採樣瓶組 ($65)' },
  { id: 'wjf_04', brand: 'wanjiafu', name: '家樂福 (內湖旗艦店)', lon: 121.5741, lat: 25.0612, x: 265, z: -150, addr: '內湖區舊宗路一段 128 號', category: '量販大賣場', supply: '全像通訊增幅卡 ($95)、生鮮熱能餐包 ($45)、廣角放大鏡 ($50)' },
  { id: 'wjf_05', brand: 'wanjiafu', name: '家樂福 (淡新旗艦店)', lon: 121.4421, lat: 25.1882, x: -235, z: -320, addr: '淡水區中山北路二段 383 號', category: '量販大賣場', supply: '極地防寒機能餐包 ($50)、淡新水能補給瓶 ($30)、鹽分檢測筆 ($110)' },
  { id: 'wjf_06', brand: 'wanjiafu', name: '家樂福 (板橋三民旗艦店)', lon: 121.4673, lat: 25.0162, x: -125, z: 140, addr: '板橋區三民路二段 31 號', category: '量販大賣場', supply: '板橋科技儲能包 ($110)、特製能量三明治 ($38)、數位游標卡尺 ($85)' },

  // ── 家樂福便利購 (Carrefour Market) 超市便利購 ──
  { id: 'ljk_01', brand: 'lejiakang', name: '家樂福便利購 (板橋學府店)', lon: 121.4582, lat: 25.0104, x: -150, z: 168, addr: '板橋區學府路一段 146 號 (1:1真實門牌)', category: '生鮮超市', supply: '家樂福量子熱量棒 ($25)、1500ml 離子水 ($30)、精密量筒 ($45)' },
  { id: 'ljk_02', brand: 'lejiakang', name: '家樂福便利購 (站前開封店)', lon: 121.5135, lat: 25.0452, x: 20, z: 110, addr: '中正區開封街一段 38 號', category: '生鮮超市', supply: '站前極速補給餐 ($42)、全像解碼透鏡 ($60)、試紙滴管組 ($35)' },
  { id: 'ljk_03', brand: 'lejiakang', name: '家樂福便利購 (中山松江店)', lon: 121.5332, lat: 25.0553, x: 205, z: -115, addr: '中山區松江路 168 號', category: '生鮮超市', supply: '金融快遞能量飲 ($35)、家樂福維他命膠囊 ($40)、阿基米德浮力球 ($55)' },
  { id: 'ljk_04', brand: 'lejiakang', name: '家樂福便利購 (萬華長沙店)', lon: 121.5032, lat: 25.0402, x: -185, z: 80, addr: '萬華區長沙街二段 110 號', category: '生鮮超市', supply: '萬華老街補給組 ($35)、食用小蘇打粉 ($20)、白醋溶劑 ($25)' },
  { id: 'ljk_05', brand: 'lejiakang', name: '家樂福便利購 (大稻埕民生店)', lon: 121.5105, lat: 25.0573, x: -145, z: -115, addr: '大同區民生西路 230 號', category: '生鮮超市', supply: '大稻埕乾貨能量袋 ($45)、食用沙拉油 ($30)、層析濾紙 ($25)' },
  { id: 'ljk_06', brand: 'lejiakang', name: '家樂福便利購 (大同重慶北店)', lon: 121.5131, lat: 25.0674, x: -95, z: -175, addr: '大同區重慶北路三段 154 號', category: '生鮮超市', supply: '重慶北生鮮果汁 ($32)、離子水 ($25)、微型天平秤盤 ($75)' },
  { id: 'ljk_07', brand: 'lejiakang', name: '家樂福便利購 (中山南京店)', lon: 121.5212, lat: 25.0528, x: 35, z: -95, addr: '中山區南京西路 36 號', category: '生鮮超市', supply: '南京商圈手作便當 ($65)、高纖熱量棒 ($28)、低溫冰袋 ($20)' },
  { id: 'ljk_08', brand: 'lejiakang', name: '家樂福便利購 (中山吉林店)', lon: 121.5302, lat: 25.0515, x: 165, z: -55, addr: '中山區吉林路 108 號', category: '生鮮超市', supply: '吉林元氣蔬菜汁 ($30)、電解礦泉水 ($28)、紫外線護目鏡 ($80)' },
  { id: 'ljk_09', brand: 'lejiakang', name: '家樂福便利購 (古亭和平店)', lon: 121.5192, lat: 25.0274, x: 55, z: 135, addr: '中正區和平西路一段 28 號', category: '生鮮超市', supply: '文教生活能量餐包 ($40)、無毒紫甘藍菜 ($35)、中和指示滴管 ($20)' },
  { id: 'ljk_10', brand: 'lejiakang', name: '家樂福便利購 (師大龍泉店)', lon: 121.5284, lat: 25.0253, x: 105, z: 135, addr: '大安區師大路 39 號', category: '生鮮超市', supply: '師大學子提神機能飲 ($35)、全穀燕麥棒 ($26)、天然食用色素 ($30)' },
  { id: 'ljk_11', brand: 'lejiakang', name: '家樂福便利購 (板橋文化店)', lon: 121.4632, lat: 25.0182, x: -50, z: 210, addr: '板橋區文化路一段 145 號', category: '生鮮超市', supply: '新板特區通勤補給 ($45)、冷藏純鮮乳 ($36)、防靜電採樣袋 ($25)' },
  { id: 'ljk_12', brand: 'lejiakang', name: '家樂福便利購 (板橋新埔店)', lon: 121.4682, lat: 25.0225, x: -185, z: 168, addr: '板橋區文化路一段 360 號', category: '生鮮超市', supply: '新埔捷運快充能量袋 ($38)、電解機能水 ($30)' },
  { id: 'ljk_13', brand: 'lejiakang', name: '家樂福便利購 (土城廣明店)', lon: 121.4532, lat: 24.9984, x: 15, z: 168, addr: '土城區廣明街 63 號', category: '生鮮超市', supply: '海山生活圈糧食 ($35)、礦質離子水 ($25)' },
  { id: 'ljk_14', brand: 'lejiakang', name: '家樂福便利購 (永和福和店)', lon: 121.5183, lat: 25.0062, x: -62, z: 130, addr: '永和區福和路 102 號', category: '生鮮超市', supply: '永和水岸營養穀物 ($30)、電解水充填罐 ($28)' },
  { id: 'ljk_15', brand: 'lejiakang', name: '家樂福便利購 (三重正義店)', lon: 121.4974, lat: 25.0673, x: -255, z: -35, addr: '三重區正義北路 88 號', category: '生鮮超市', supply: '重新工坊應急包 ($65)、微風電解能量棒 ($25)' },
  { id: 'ljk_16', brand: 'lejiakang', name: '家樂福便利購 (新莊幸福店)', lon: 121.4501, lat: 25.0504, x: -305, z: 75, addr: '新莊區幸福路 720 號', category: '生鮮超市', supply: '副都心高能濃縮液 ($45)、家樂福鮮果凍 ($25)' },
  { id: 'ljk_17', brand: 'lejiakang', name: '家樂福便利購 (中和景平店)', lon: 121.5023, lat: 24.9934, x: -32, z: 180, addr: '中和區景平路 182 號', category: '生鮮超市', supply: '捷運快衝機能水 ($28)、高纖能量球 ($30)' },
  { id: 'ljk_18', brand: 'lejiakang', name: '家樂福便利購 (淡水老街店)', lon: 121.4404, lat: 25.1721, x: -228, z: -315, addr: '淡水區中正路 55 號', category: '生鮮超市', supply: '鐵蛋風味能量膠 ($25)、淡水海風電解水 ($30)' },

  // ── 7-Eleven 統一超商 (嚴守 >= 38m 獨立街角拓撲) ──
  { id: 'seven_01', brand: 'seven', name: '7-Eleven 統一超商 (站前館前店)', lon: 121.5151, lat: 25.0456, x: -20, z: 65, addr: '中正區館前路 59 號', category: '便利商店', supply: '茶裏王日式綠茶 ($25)、御飯糰 ($30)、熱茶葉蛋 ($13)' },
  { id: 'seven_02', brand: 'seven', name: '7-Eleven 統一超商 (站前公園店)', lon: 121.5165, lat: 25.0441, x: 60, z: 35, addr: '中正區公園路 20 號', category: '便利商店', supply: 'CITY CAFE 美式 ($35)、真飽涼麵 ($52)、能量補給凍 ($38)' },
  { id: 'seven_03', brand: 'seven', name: '7-Eleven 統一超商 (中正衡陽店)', lon: 121.5122, lat: 25.0425, x: -95, z: 95, addr: '中正區衡陽路 51 號', category: '便利商店', supply: '純喫茶紅茶 ($20)、統一麵包草莓夾心 ($28)、3M 採樣膠帶 ($30)' },
  { id: 'seven_04', brand: 'seven', name: '7-Eleven 統一超商 (西門中華店)', lon: 121.5074, lat: 25.0432, x: -145, z: 10, addr: '萬華區中華路一段 144 號', category: '便利商店', supply: '黑松沙士 ($30)、大亨堡原味熱狗 ($35)、隨身夾鏈袋 ($20)' },
  { id: 'seven_05', brand: 'seven', name: '7-Eleven 統一超商 (寧夏夜市店)', lon: 121.5148, lat: 25.0571, x: -55, z: -145, addr: '大同區民生西路 188 號', category: '便利商店', supply: '原萃玉露綠茶 ($25)、科學麵 ($10)、LED 驗鈔手電筒 ($65)' },
  { id: 'seven_06', brand: 'seven', name: '7-Eleven 統一超商 (大稻埕迪化店)', lon: 121.5101, lat: 25.0545, x: -185, z: -125, addr: '大同區迪化街一段 54 號', category: '便利商店', supply: '舒跑離子水 ($25)、光泉豆漿 ($25)、透明量杯 ($30)' },
  { id: 'seven_07', brand: 'seven', name: '7-Eleven 統一超商 (迪化二店)', lon: 121.5098, lat: 25.0562, x: -185, z: -80, addr: '大同區迪化街一段 82 號', category: '便利商店', supply: '麥香奶茶 ($15)、夾心餅乾 ($25)、放大鏡 ($40)' },
  { id: 'seven_08', brand: 'seven', name: '7-Eleven 統一超商 (中山民權店)', lon: 121.5218, lat: 25.0618, x: 35, z: -195, addr: '中山區中山北路二段 92 號', category: '便利商店', supply: '統一布丁 ($15)、全脂鮮乳 ($36)、防刮手套 ($35)' },
  { id: 'seven_09', brand: 'seven', name: '7-Eleven 統一超商 (林森條通店)', lon: 121.5255, lat: 25.0502, x: 125, z: -60, addr: '中山區林森北路 119 號', category: '便利商店', supply: '熱咖啡 ($45)、三明治 ($35)、夾鏈物證袋組 ($25)' },
  { id: 'seven_10', brand: 'seven', name: '7-Eleven 統一超商 (復興長安店)', lon: 121.5438, lat: 25.0489, x: 205, z: -55, addr: '中山區復興北路 88 號', category: '便利商店', supply: '健達繽紛樂 ($38)、寶礦力水得 ($25)、量尺捲尺 ($45)' },
  { id: 'seven_11', brand: 'seven', name: '7-Eleven 統一超商 (中正紀念堂店)', lon: 121.5186, lat: 25.0345, x: 80, z: 75, addr: '中正區中山南路 21 號', category: '便利商店', supply: '悅氏礦泉水 ($20)、能量威化餅 ($30)、紫外手電筒 ($70)' },
  { id: 'seven_12', brand: 'seven', name: '7-Eleven 統一超商 (羅斯福師大店)', lon: 121.5242, lat: 25.0268, x: 55, z: 185, addr: '中正區羅斯福路二段 88 號', category: '便利商店', supply: '純吃茶綠茶 ($20)、雞肉飯糰 ($35)、塑膠滴管組 ($15)' },
  { id: 'seven_13', brand: 'seven', name: '7-Eleven 統一超商 (敦南科技店)', lon: 121.5487, lat: 25.0312, x: 155, z: 185, addr: '大安區敦化南路二段 77 號', category: '便利商店', supply: '星巴克黑咖啡 ($65)、瑞士三角巧克力 ($42)、鑷子取樣器 ($25)' },
  { id: 'seven_14', brand: 'seven', name: '7-Eleven 統一超商 (府中縣民店)', lon: 121.4605, lat: 25.0125, x: -185, z: 130, addr: '板橋區縣民大道一段 88 號', category: '便利商店', supply: '熱拿鐵 ($45)、肉鬆麵包 ($28)、物證拍照標籤卡 ($15)' },
  { id: 'seven_15', brand: 'seven', name: '7-Eleven 統一超商 (學城門市)', lon: 121.4589, lat: 25.0112, x: -95, z: 168, addr: '板橋區學府路一段 118 號 (海山生活圈)', category: '便利商店', supply: '雙卷壽司 ($45)、麥香紅茶 ($15)、文具筆記本 ($20)' },
  { id: 'seven_16', brand: 'seven', name: '7-Eleven 統一超商 (板橋文化店)', lon: 121.4641, lat: 25.0175, x: -5, z: 210, addr: '板橋區文化路一段 136 號', category: '便利商店', supply: '即食雞胸肉 ($59)、無糖烏龍茶 ($25)、棉質手套 ($20)' },
  { id: 'seven_17', brand: 'seven', name: '7-Eleven 統一超商 (中正愛國店)', lon: 121.5135, lat: 25.0368, x: 55, z: 110, addr: '中正區愛國西路 9 號', category: '便利商店', supply: '可口可樂 ($29)、洋芋片 ($35)、指紋刷碳粉組 ($50)' },
  { id: 'seven_18', brand: 'seven', name: '7-Eleven 統一超商 (信義101門市)', lon: 121.5654, lat: 25.0335, x: 235, z: 50, addr: '信義區市府路 45 號 B1 (101商圈)', category: '便利商店', supply: '精品美式 ($55)、瑞士蓮巧克力 ($60)、全息雷達校正模組 ($120)' },
  { id: 'seven_19', brand: 'seven', name: '7-Eleven 統一超商 (松山饒河門市)', lon: 121.5772, lat: 25.0505, x: 220, z: -85, addr: '松山區八德路四段 700 號 (饒河夜市口)', category: '便利商店', supply: '冬瓜鮮奶 ($35)、胡椒餅專用胡椒粉包 ($10)' },
  { id: 'seven_20', brand: 'seven', name: '7-Eleven 統一超商 (淡水水岸門市)', lon: 121.4398, lat: 25.1698, x: -230, z: -330, addr: '淡水區中正路 11 號 (金色水岸旁)', category: '便利商店', supply: '阿婆鐵蛋 ($50)、淡水酸梅湯 ($35)、防風打火機 ($20)' },

  // ── 全家 FamilyMart (嚴守 >= 38m 獨立街角拓撲) ──
  { id: 'fm_01', brand: 'familymart', name: '全家便利商店 (站前忠孝店)', lon: 121.5168, lat: 25.0465, x: -65, z: -20, addr: '中正區忠孝西路一段 36 號', category: '便利商店', supply: 'Let\'s Café 經典美式 ($35)、酷繽沙 ($60)、超柔土司 ($32)' },
  { id: 'fm_02', brand: 'familymart', name: '全家便利商店 (懷寧襄陽店)', lon: 121.5142, lat: 25.0441, x: -55, z: 80, addr: '中正區襄陽路 9 號', category: '便利商店', supply: 'Fami 霜淇淋 ($49)、金家豆腐鍋飯糰 ($35)、微型試劑管 ($20)' },
  { id: 'fm_03', brand: 'familymart', name: '全家便利商店 (西門武昌店)', lon: 121.5062, lat: 25.0442, x: -205, z: 15, addr: '萬華區武昌街二段 37 號', category: '便利商店', supply: '烤熱地瓜 ($35)、義美豆奶 ($20)、螢光筆 ($18)' },
  { id: 'fm_04', brand: 'familymart', name: '全家便利商店 (西門成都店)', lon: 121.5068, lat: 25.0422, x: -185, z: 45, addr: '萬華區成都路 23 號', category: '便利商店', supply: '匠土司 ($35)、熱拿鐵 ($45)、便條紙物證標籤 ($15)' },
  { id: 'fm_05', brand: 'familymart', name: '全家便利商店 (建成圓環店)', lon: 121.5134, lat: 25.0542, x: -95, z: -45, addr: '大同區重慶北路二段 12 號', category: '便利商店', supply: '四季金萱茶 ($30)、古早味蛋塔 ($35)、手持放大鏡 ($45)' },
  { id: 'fm_06', brand: 'familymart', name: '全家便利商店 (中山北路店)', lon: 121.5218, lat: 25.0498, x: 125, z: -20, addr: '中山區中山北路一段 105 號', category: '便利商店', supply: '香蕉 ($20)、高纖豆漿 ($25)、棉花棒採樣包 ($15)' },
  { id: 'fm_07', brand: 'familymart', name: '全家便利商店 (中山雙連店)', lon: 121.5208, lat: 25.0582, x: 105, z: -150, addr: '中山區民生西路 66 號', category: '便利商店', supply: '威德運動補給凍 ($42)、能量燕麥飲 ($30)、試紙色卡 ($25)' },
  { id: 'fm_08', brand: 'familymart', name: '全家便利商店 (松江南京店)', lon: 121.5332, lat: 25.0515, x: 165, z: -105, addr: '中山區松江路 102 號', category: '便利商店', supply: '無糖黑咖啡 ($35)、茶葉蛋 ($13)、防塵口罩 ($15)' },
  { id: 'fm_09', brand: 'familymart', name: '全家便利商店 (復興南京店)', lon: 121.5438, lat: 25.0522, x: 205, z: -175, addr: '中山區復興北路 45 號', category: '便利商店', supply: '能量能量球 ($30)、運動機能水 ($28)、精密尺標 ($30)' },
  { id: 'fm_10', brand: 'familymart', name: '全家便利商店 (大安信義店)', lon: 121.5392, lat: 25.0335, x: 155, z: 65, addr: '大安區信義路三段 102 號', category: '便利商店', supply: 'FamiCollection 水果乾 ($40)、氣泡水 ($29)' },
  { id: 'fm_11', brand: 'familymart', name: '全家便利商店 (師大龍泉店)', lon: 121.5292, lat: 25.0242, x: 105, z: 155, addr: '大安區師大路 59 號', category: '便利商店', supply: '蜂蜜燕麥奶 ($35)、三角御飯糰 ($30)' },
  { id: 'fm_12', brand: 'familymart', name: '全家便利商店 (板橋縣民店)', lon: 121.4612, lat: 25.0118, x: -65, z: 125, addr: '板橋區縣民大道一段 110 號', category: '便利商店', supply: '大杯拿鐵 ($55)、黑胡椒雞胸肉 ($59)' },
  { id: 'fm_13', brand: 'familymart', name: '全家便利商店 (板橋府中店)', lon: 121.4585, lat: 25.0089, x: -100, z: 210, addr: '板橋區府中路 35 號', category: '便利商店', supply: '經典黑咖啡 ($35)、超柔草莓麵包 ($28)' },
  { id: 'fm_14', brand: 'familymart', name: '全家便利商店 (板橋學府二店)', lon: 121.4586, lat: 25.0108, x: -128, z: 158, addr: '板橋區學府路一段 98 號 (海山生活圈)', category: '便利商店', supply: '御茶園台灣綠茶 ($25)、原味熱狗 ($35)' },
  { id: 'fm_15', brand: 'familymart', name: '全家便利商店 (三重台北橋店)', lon: 121.4995, lat: 25.0632, x: -260, z: -40, addr: '三重區文化北路 10 號', category: '便利商店', supply: '仙草蜜茶 ($25)、肉包肉捲 ($32)' },
  { id: 'fm_16', brand: 'familymart', name: '全家便利商店 (永和頂溪店)', lon: 121.5165, lat: 25.0135, x: -65, z: 135, addr: '永和區永和路二段 145 號', category: '便利商店', supply: '永和豆漿奶茶 ($25)、豆沙包 ($25)' },
  { id: 'fm_17', brand: 'familymart', name: '全家便利商店 (新店碧潭店)', lon: 121.5392, lat: 24.9582, x: 80, z: 270, addr: '新店區新店路 120 號', category: '便利商店', supply: '碧潭礦泉水 ($20)、能量棒 ($30)' },

  // ── CoCo 都可手搖飲 ──
  { id: 'coco_01', brand: 'coco', name: 'CoCo 都可 (台北站前店)', lon: 121.5162, lat: 25.0445, x: 20, z: 65, addr: '中正區南陽街 13 號', category: '手搖飲', supply: '百香雙響炮 ($55)、珍珠奶茶 ($50)、四季春青茶 ($35)' },
  { id: 'coco_02', brand: 'coco', name: 'CoCo 都可 (重慶書店街店)', lon: 121.5132, lat: 25.0435, x: -95, z: 15, addr: '中正區重慶南路一段 55 號', category: '手搖飲', supply: '奶茶三兄弟 ($60)、芒果綠茶 ($45)、檸檬冬瓜露 ($40)' },
  { id: 'coco_03', brand: 'coco', name: 'CoCo 都可 (西門町店)', lon: 121.5072, lat: 25.0442, x: -175, z: 40, addr: '萬華區武昌街二段 4 號', category: '手搖飲', supply: '芋頭波波鮮奶 ($65)、百香雙響炮 ($55)' },
  { id: 'coco_04', brand: 'coco', name: 'CoCo 都可 (延平北路店)', lon: 121.5112, lat: 25.0548, x: -145, z: -45, addr: '大同區延平北路二段 80 號', category: '手搖飲', supply: '冬瓜露檸檬 ($40)、阿里山初露青茶 ($35)' },
  { id: 'coco_05', brand: 'coco', name: 'CoCo 都可 (中山北路門市)', lon: 121.5212, lat: 25.0488, x: 115, z: -105, addr: '中山區中山北路一段 92 號', category: '手搖飲', supply: '雲朵奶蓋紅茶 ($50)、熟成紅茶 ($35)' },
  { id: 'coco_06', brand: 'coco', name: 'CoCo 都可 (松江南京店)', lon: 121.5332, lat: 25.0528, x: 165, z: -155, addr: '中山區松江路 120 號', category: '手搖飲', supply: '解憂綠茶 ($35)、珍珠醇奶茶 ($50)' },
  { id: 'coco_07', brand: 'coco', name: 'CoCo 都可 (大安復興店)', lon: 121.5435, lat: 25.0415, x: 155, z: 125, addr: '大安區復興南路一段 150 號', category: '手搖飲', supply: '蜜香檸檬汁 ($45)、茉莉綠茶 ($30)' },
  { id: 'coco_08', brand: 'coco', name: 'CoCo 都可 (板橋府中店)', lon: 121.4592, lat: 25.0092, x: -140, z: 210, addr: '板橋區中山路一段 50 號', category: '手搖飲', supply: '百香雙響炮 ($55)、芋圓奶茶 ($50)' },
  { id: 'coco_09', brand: 'coco', name: 'CoCo 都可 (板橋重慶店)', lon: 121.4581, lat: 25.0118, x: -40, z: 168, addr: '板橋生活圈 重慶路 179 號', category: '手搖飲', supply: '四季春茶 ($35)、波霸珍珠奶茶 ($50)' },

  // ── 雙北代表性傳統市場與夜市 (市井情報與在地小吃補給) ──
  { id: 'mkt_01', brand: 'market', name: '城中市場老市集', lon: 121.5128, lat: 25.0438, x: -95, z: 55, addr: '中正區武昌街一段 22 巷 (省城隍廟口)', category: '傳統市場與夜市', supply: '老牌牛肉麵 ($130)、現切水果切盤 ($50)、市井目擊證言情報' },
  { id: 'mkt_02', brand: 'market', name: '西門市場 ✕ 紅樓文創市集', lon: 121.5071, lat: 25.0423, x: -135, z: 52, addr: '萬華區成都路 10 號', category: '傳統市場與夜市', supply: '西門紅樓手作徽章 ($80)、百年老茶舖冷泡茶 ($45)、街友目擊線索' },
  { id: 'mkt_03', brand: 'market', name: '建成圓環 ✕ 寧夏觀光夜市', lon: 121.5152, lat: 25.0568, x: -55, z: -95, addr: '大同區寧夏路民生西路口', category: '傳統市場與夜市', supply: '寧夏鹽酥雞 ($65)、蚵仔煎 ($80)、潤餅 ($55)、夜間目擊證言' },
  { id: 'mkt_04', brand: 'market', name: '大稻埕永樂市場', lon: 121.5104, lat: 25.0538, x: -185, z: -60, addr: '大同區迪化街一段 21 號', category: '傳統市場與夜市', supply: '百年林合發油飯 ($60)、永樂旗魚米粉 ($45)、中藥鋪研磨硫磺粉 ($35)' },
  { id: 'mkt_05', brand: 'market', name: '大同蘭州傳統市場', lon: 121.5142, lat: 25.0668, x: -145, z: -185, addr: '大同區昌吉街 55 號', category: '傳統市場與夜市', supply: '黑點白斬雞 ($110)、生鮮果菜籃 ($50)、清晨進貨時間紀錄' },
  { id: 'mkt_06', brand: 'market', name: '中山傳統市場', lon: 121.5218, lat: 25.0495, x: 35, z: -45, addr: '中山區長安西路 3 號 (中山北路口)', category: '傳統市場與夜市', supply: '古早味切仔麵 ($45)、紅燒肉 ($60)、條通店家出入情報' },
  { id: 'mkt_07', brand: 'market', name: '雙連傳統市場', lon: 121.5178, lat: 25.0578, x: 45, z: -145, addr: '大同區民生西路 198 號 (文昌宮旁)', category: '傳統市場與夜市', supply: '雙連圓仔湯 ($55)、文昌帝君許願筆 ($20)、早市目擊口供' },
  { id: 'mkt_08', brand: 'market', name: '晴光傳統商圈市場', lon: 121.5248, lat: 25.0628, x: 85, z: -195, addr: '中山區雙城街 12 巷 (晴光商圈)', category: '傳統市場與夜市', supply: '晴光爆漿紅豆餅 ($15)、脆皮鮮奶甜甜圈 ($25)、晴光姑嫂麵 ($50)' },
  { id: 'mkt_09', brand: 'market', name: '師大夜市 ✕ 龍泉傳統市場', lon: 121.5288, lat: 25.0248, x: 105, z: 185, addr: '大安區師大路 49 巷', category: '傳統市場與夜市', supply: '師大生煎包 ($18)、許記鹽水雞 ($80)、燈籠滷味 ($65)、學生社團情報' },
  { id: 'mkt_10', brand: 'market', name: '板橋湳雅觀光夜市', lon: 121.4552, lat: 25.0078, x: -205, z: 168, addr: '板橋區南雅東路 87 號', category: '傳統市場與夜市', supply: '湳雅王記麻油雞 ($120)、現炸旗魚黑輪 ($20)、烤肉串 ($35)' },
  { id: 'mkt_11', brand: 'market', name: '板橋黃石傳統市場', lon: 121.4578, lat: 25.0098, x: -185, z: 210, addr: '板橋區宮口街 37 號 (府中商圈)', category: '傳統市場與夜市', supply: '高記生炒魷魚 ($50)、炸蘿蔔糕 ($25)、黃石肉羹 ($50)、府中早市情報' },

  // ── 重要大眾運輸站點與古蹟地標 ──
  { id: 'trn_01', brand: 'transport', name: '台北車站 (特等站大樓)', lon: 121.5171, lat: 25.0478, x: 0, z: -70, addr: '中正區北平西路 3 號', category: '公共交通地標', supply: '台鐵便當排骨飯 ($80)、悠遊卡自動加值、三鐵轉運路線圖' },
  { id: 'trn_02', brand: 'transport', name: '台北車站(忠孝)公車專用道月台', lon: 121.5168, lat: 25.0461, x: -20, z: -5, addr: '中正區忠孝西路中央公車專用道', category: '公共交通地標', supply: '搭乘 307 幹線公車 (往中山/松江南京/板橋府中)' },
  { id: 'trn_03', brand: 'transport', name: '中山市場公車站牌', lon: 121.5218, lat: 25.0512, x: 78, z: -40, addr: '中山區中山北路一段', category: '公共交通地標', supply: '搭乘 307 幹線公車 (往台北車站/板橋)' },
  { id: 'trn_04', brand: 'transport', name: '板橋學府路一段公車站牌', lon: 121.4582, lat: 25.0108, x: -150, z: 168, addr: '板橋區學府路一段 (海山生活圈)', category: '公共交通地標', supply: '搭乘 307 幹線公車 (前往新板特區/台北車站)' },
  { id: 'trn_05', brand: 'transport', name: '捷運西門站公車站牌', lon: 121.5078, lat: 25.0428, x: -152, z: 25, addr: '萬華區中華路一段 (捷運西門站 6 號出口)', category: '公共交通地標', supply: '搭乘 307 幹線公車 (前往台北車站 / 松江南京)' },
  { id: 'trn_06', brand: 'transport', name: '捷運松江南京站公車站牌', lon: 121.5332, lat: 25.0522, x: 155, z: -97, addr: '中山區南京東路二段 ✕ 松江路口', category: '公共交通地標', supply: '搭乘 307 幹線公車 (前往台北車站 / 板橋府中)' },
  { id: 'trn_07', brand: 'transport', name: '捷運台北車站 M6 出入口', lon: 121.5162, lat: 25.0458, x: 95, z: 15, addr: '中正區忠孝西路一段 66 號地下 (新光三越前)', category: '公共交通地標', supply: '台北捷運閘門 (板南線/淡水信義線)' },
  { id: 'trn_08', brand: 'transport', name: '捷運中山站 4 號出入口', lon: 121.5208, lat: 25.0528, x: 78, z: -95, addr: '中山區南京西路 16 號 (心中山線形公園)', category: '公共交通地標', supply: '台北捷運閘門 (淡水信義線/松山新店線)' },
  { id: 'trn_09', brand: 'transport', name: '捷運府中站 1 號出入口', lon: 121.4588, lat: 25.0085, x: -145, z: 210, addr: '板橋區縣民大道一段 193 號', category: '公共交通地標', supply: '台北捷運閘門 (板南線直通西門與台北車站)' },
  { id: 'trn_10', brand: 'transport', name: '淡水河渡輪金色水岸棧道', lon: 121.4392, lat: 25.1705, x: -210, z: -95, addr: '淡水區金色水岸渡船頭', category: '公共交通地標', supply: '搭乘淡水渡輪 (往八里左岸 $34)' },
  { id: 'lmk_01', brand: 'landmark', name: '國立臺灣博物館 (希臘多立克式宮殿)', lon: 121.5148, lat: 25.0428, x: -67.5, z: 66, addr: '中正區襄陽路 2 號 (二二八和平公園北側)', category: '公共交通地標', supply: '地質礦石標本檢驗借用、微型自然科學講堂' },
  { id: 'lmk_02', brand: 'landmark', name: '國定古蹟 景福門 (東門圓環)', lon: 121.5178, lat: 25.0385, x: 60, z: 108, addr: '中正區中山南路 ✕ 凱達格蘭大道口', category: '公共交通地標', supply: '台北城歷史拓撲石碑、古蹟測量定位點' },
  // ── 新北各大行政特區旗艦門市 (家樂福量販 ✕ 家樂福便利購 ✕ 連鎖超商全雙北 1:1) ──
  { id: 'wjf_07', brand: 'wanjiafu', name: '家樂福 (中和旗艦店)', lon: 121.4982, lat: 24.9982, x: -35, z: 175, addr: '中和區中山路二段 228 號', category: '量販大賣場', supply: '中和科技儲能包 ($110)、離子能量水 ($30)' },
  { id: 'wjf_08', brand: 'wanjiafu', name: '家樂福 (新莊旗艦店)', lon: 121.4392, lat: 25.0345, x: -310, z: 80, addr: '新莊區中正路 514 號', category: '量販大賣場', supply: '副都心科技補給箱 ($120)、生鮮熱能餐包 ($45)' },
  { id: 'wjf_09', brand: 'wanjiafu', name: '家樂福 (蘆洲旗艦店)', lon: 121.4882, lat: 25.0835, x: -250, z: -160, addr: '蘆洲區集賢路 411 號', category: '量販大賣場', supply: '微風水岸能量餐包 ($40)、純水 ($25)' },
  { id: 'wjf_10', brand: 'wanjiafu', name: '家樂福 (樹林旗艦店)', lon: 121.4252, lat: 24.9952, x: -220, z: 240, addr: '樹林區大安路 118 號', category: '量販大賣場', supply: '鐵道科技工藝包 ($110)、探勘工具組 ($95)' },
  { id: 'wjf_11', brand: 'wanjiafu', name: '家樂福 (汐止旗艦店)', lon: 121.6482, lat: 25.0612, x: 390, z: -30, addr: '汐止區新台五路一段 99 號', category: '量販大賣場', supply: '雲端運算儲能模組 ($120)、防寒手套 ($50)' },
  { id: 'wjf_12', brand: 'wanjiafu', name: '家樂福 (三峽旗艦店)', lon: 121.3752, lat: 24.9382, x: -260, z: 320, addr: '三峽區文化路 65 號', category: '量販大賣場', supply: '三峽藍染古風背包 ($130)、能量點心 ($35)' },

  // ── 新北各區家樂福便利購超市 ──
  { id: 'ljk_19', brand: 'lejiakang', name: '家樂福便利購 (新店北新店)', lon: 121.5412, lat: 24.9682, x: 80, z: 270, addr: '新店區北新路二段 88 號', category: '生鮮超市', supply: '碧潭能量機能水 ($30)、生鮮果菜籃 ($45)' },
  { id: 'ljk_20', brand: 'lejiakang', name: '家樂福便利購 (土城金城店)', lon: 121.4552, lat: 24.9822, x: -120, z: 250, addr: '土城區金城路三段 102 號', category: '生鮮超市', supply: '高嶺能源餐包 ($40)、電解質離子飲 ($28)' },
  { id: 'ljk_21', brand: 'lejiakang', name: '家樂福便利購 (蘆洲三民店)', lon: 121.4722, lat: 25.0852, x: -250, z: -150, addr: '蘆洲區三民路 150 號', category: '生鮮超市', supply: '微風水域補給盒 ($45)、維他命水 ($25)' },
  { id: 'ljk_22', brand: 'lejiakang', name: '家樂福便利購 (樹林大安店)', lon: 121.4212, lat: 24.9922, x: -215, z: 245, addr: '樹林區大安路 38 號', category: '生鮮超市', supply: '樹林調車場能量罐 ($35)、高纖燕麥 ($30)' },
  { id: 'ljk_23', brand: 'lejiakang', name: '家樂福便利購 (鶯歌國慶店)', lon: 121.3522, lat: 24.9532, x: -330, z: 310, addr: '鶯歌區國慶街 92 號', category: '生鮮超市', supply: '陶瓷光澤保溫瓶 ($65)、元氣穀物棒 ($25)' },
  { id: 'ljk_24', brand: 'lejiakang', name: '家樂福便利購 (林口文化店)', lon: 121.3752, lat: 25.0772, x: -380, z: -180, addr: '林口區文化二路一段 120 號', category: '生鮮超市', supply: '霧都防寒能量湯 ($50)、高能巧克力 ($35)' },
  { id: 'ljk_25', brand: 'lejiakang', name: '家樂福便利購 (汐止大同店)', lon: 121.6622, lat: 25.0682, x: 395, z: -25, addr: '汐止區大同路二段 210 號', category: '生鮮超市', supply: '科技水廊補給組 ($40)、微型採樣盒 ($30)' },

  // ── 全雙北 41 行政特區代表性 7-Eleven 統一超商 ──
  { id: 'seven_21', brand: 'seven', name: '7-Eleven 統一超商 (士林官邸門市)', lon: 121.5312, lat: 25.0942, x: -60, z: -210, addr: '士林區中山北路五段 460 號', category: '便利商店', supply: '純喫茶綠茶 ($20)、御飯糰 ($30)' },
  { id: 'seven_22', brand: 'seven', name: '7-Eleven 統一超商 (新北投溫泉門市)', lon: 121.5062, lat: 25.1362, x: -160, z: -270, addr: '北投區光明路 220 號 (地熱谷前)', category: '便利商店', supply: '熱咖啡 ($45)、溫泉茶葉蛋 ($15)' },
  { id: 'seven_23', brand: 'seven', name: '7-Eleven 統一超商 (內湖港墘門市)', lon: 121.5752, lat: 25.0802, x: 270, z: -160, addr: '內湖區港墘路 110 號 (內科核心)', category: '便利商店', supply: 'CITY CAFE 特大拿鐵 ($60)、能量凍 ($38)' },
  { id: 'seven_24', brand: 'seven', name: '7-Eleven 統一超商 (南港軟體園區門市)', lon: 121.6152, lat: 25.0592, x: 370, z: -60, addr: '南港區三重路 19 號 (南軟大樓)', category: '便利商店', supply: '大亨堡 ($35)、黑咖啡 ($35)' },
  { id: 'seven_25', brand: 'seven', name: '7-Eleven 統一超商 (文山政大門市)', lon: 121.5772, lat: 24.9882, x: 170, z: 230, addr: '文山區指南路二段 64 號', category: '便利商店', supply: '茶裏王烏龍茶 ($25)、科學麵 ($10)' },
  { id: 'seven_26', brand: 'seven', name: '7-Eleven 統一超商 (新莊輔大門市)', lon: 121.4352, lat: 25.0322, x: -315, z: 85, addr: '新莊區中正路 510 號', category: '便利商店', supply: '熱狗堡 ($35)、可樂 ($29)' },
  { id: 'seven_27', brand: 'seven', name: '7-Eleven 統一超商 (三重天台門市)', lon: 121.4982, lat: 25.0622, x: -260, z: -40, addr: '三重區重新路二段 78 號', category: '便利商店', supply: '真飽涼麵 ($52)、冰咖啡 ($35)' },
  { id: 'seven_28', brand: 'seven', name: '7-Eleven 統一超商 (蘆洲湧蓮門市)', lon: 121.4702, lat: 25.0842, x: -250, z: -160, addr: '蘆洲區得勝街 120 號', category: '便利商店', supply: '舒跑 ($25)、御飯糰 ($30)' },
  { id: 'seven_29', brand: 'seven', name: '7-Eleven 統一超商 (中和遠東門市)', lon: 121.4892, lat: 25.0032, x: -35, z: 175, addr: '中和區連城路 258 號 (遠東世紀廣場)', category: '便利商店', supply: '能量飲料 ($45)、生菜沙拉 ($45)' },
  { id: 'seven_30', brand: 'seven', name: '7-Eleven 統一超商 (永和樂華門市)', lon: 121.5122, lat: 25.0092, x: -65, z: 135, addr: '永和區永平路 81 號 (樂華夜市口)', category: '便利商店', supply: '烤雞三明治 ($38)、綠茶 ($25)' },
  { id: 'seven_31', brand: 'seven', name: '7-Eleven 統一超商 (新店大坪林門市)', lon: 121.5412, lat: 24.9822, x: 80, z: 270, addr: '新店區民權路 42 號', category: '便利商店', supply: '能量燕麥棒 ($28)、礦泉水 ($20)' },
  { id: 'seven_32', brand: 'seven', name: '7-Eleven 統一超商 (土城頂埔門市)', lon: 121.4442, lat: 24.9722, x: -120, z: 250, addr: '土城區中央路四段 52 號 (頂埔捷運站)', category: '便利商店', supply: '高科技快充線 ($99)、運動飲料 ($25)' },
  { id: 'seven_33', brand: 'seven', name: '7-Eleven 統一超商 (淡水淡江門市)', lon: 121.4522, lat: 25.1742, x: -230, z: -330, addr: '淡水區英專路 88 號', category: '便利商店', supply: '鐵蛋便當 ($75)、冷萃綠茶 ($35)' },
  { id: 'seven_34', brand: 'seven', name: '7-Eleven 統一超商 (八里左岸門市)', lon: 121.4322, lat: 25.1612, x: -310, z: -300, addr: '八里區觀海大道 53 號', category: '便利商店', supply: '雙胞胎點心 ($20)、防風防曬乳 ($85)' },
  { id: 'seven_35', brand: 'seven', name: '7-Eleven 統一超商 (五股水碓門市)', lon: 121.4252, lat: 25.0712, x: -310, z: -80, addr: '五股區水碓九路 12 號', category: '便利商店', supply: '天然礦泉水 ($20)、能量棒 ($30)' },
  { id: 'seven_36', brand: 'seven', name: '7-Eleven 統一超商 (泰山明志門市)', lon: 121.4282, lat: 25.0482, x: -340, z: 0, addr: '泰山區明志路二段 85 號', category: '便利商店', supply: '咖啡拿鐵 ($45)、手工餅乾 ($25)' },
  { id: 'seven_37', brand: 'seven', name: '7-Eleven 統一超商 (林口三井門市)', lon: 121.3652, lat: 25.0712, x: -380, z: -180, addr: '林口區文化三路一段 356 號', category: '便利商店', supply: '精品美式 ($55)、進口巧克力 ($65)' },
  { id: 'seven_38', brand: 'seven', name: '7-Eleven 統一超商 (深坑老街門市)', lon: 121.6162, lat: 25.0022, x: 250, z: 210, addr: '深坑區深坑街 108 號', category: '便利商店', supply: '深坑豆腐乾 ($45)、烏梅汁 ($35)' },
  { id: 'seven_39', brand: 'seven', name: '7-Eleven 統一超商 (石碇千島門市)', lon: 121.6582, lat: 24.9912, x: 330, z: 260, addr: '石碇區碇坪路一段 62 號', category: '便利商店', supply: '石碇包種茶糖 ($35)、離子水 ($25)' },
  { id: 'seven_40', brand: 'seven', name: '7-Eleven 統一超商 (坪林茶香門市)', lon: 121.7112, lat: 24.9372, x: 370, z: 330, addr: '坪林區坪林街 105 號 (水岸公園旁)', category: '便利商店', supply: '坪林包種冷泡茶 ($40)、茶香茶葉蛋 ($18)' },
  { id: 'seven_41', brand: 'seven', name: '7-Eleven 統一超商 (三芝淺水灣門市)', lon: 121.4752, lat: 25.2422, x: -290, z: -410, addr: '三芝區後厝里北勢子 45 號', category: '便利商店', supply: '海邊椰子水 ($35)、冰棒 ($25)' },
  { id: 'seven_42', brand: 'seven', name: '7-Eleven 統一超商 (石門富貴角門市)', lon: 121.5682, lat: 25.2902, x: -220, z: -450, addr: '石門區中央路 31 號 (極北門市)', category: '便利商店', supply: '石門肉粽 ($40)、熱薑茶 ($35)' },
  { id: 'seven_43', brand: 'seven', name: '7-Eleven 統一超商 (金山老街門市)', lon: 121.6422, lat: 25.2222, x: -150, z: -420, addr: '金山區金包里街 88 號', category: '便利商店', supply: '金山地瓜酥 ($50)、溫泉水 ($25)' },
  { id: 'seven_44', brand: 'seven', name: '7-Eleven 統一超商 (萬里野柳門市)', lon: 121.6912, lat: 25.2062, x: 70, z: -420, addr: '萬里區港東路 167 號 (野柳地質公園旁)', category: '便利商店', supply: '女王頭紀念水 ($30)、海苔脆片 ($35)' },
  { id: 'seven_45', brand: 'seven', name: '7-Eleven 統一超商 (瑞芳九份門市)', lon: 121.8442, lat: 25.1092, x: 480, z: -60, addr: '瑞芳區基山街 12 號 (九份老街口)', category: '便利商店', supply: '九份芋圓仙草凍 ($45)、高山茶 ($35)' },
  { id: 'seven_46', brand: 'seven', name: '7-Eleven 統一超商 (平溪十分門市)', lon: 121.7872, lat: 25.0482, x: 430, z: 160, addr: '平溪區十分街 68 號 (十分瀑布旁)', category: '便利商店', supply: '天燈祈福紀念明信片 ($30)、礦泉水 ($20)' },
  { id: 'seven_47', brand: 'seven', name: '7-Eleven 統一超商 (雙溪車站門市)', lon: 121.8652, lat: 25.0342, x: 490, z: 220, addr: '雙溪區朝陽街 1 號 (雙溪火車站旁)', category: '便利商店', supply: '雙溪野薑花粽 ($35)、冷泡茶 ($30)' },
  { id: 'seven_48', brand: 'seven', name: '7-Eleven 統一超商 (貢寮福隆門市)', lon: 121.9442, lat: 25.0162, x: 560, z: 210, addr: '貢寮區福隆街 1 號 (福隆海水浴場旁)', category: '便利商店', supply: '福隆月台便當 ($75)、運動飲料 ($25)' },
  { id: 'seven_49', brand: 'seven', name: '7-Eleven 統一超商 (烏來老街門市)', lon: 121.5502, lat: 24.8652, x: 110, z: 380, addr: '烏來區烏來街 18 號 (溫泉橋頭)', category: '便利商店', supply: '烏來馬告香腸 ($40)、溫泉能量水 ($25)' },

  // ── 重要大眾運輸站點與古蹟地標 ──
  { id: 'trn_01', brand: 'transport', name: '台北車站 (特等站大樓)', lon: 121.5171, lat: 25.0478, x: 0, z: -70, addr: '中正區北平西路 3 號', category: '公共交通地標', supply: '台鐵便當排骨飯 ($80)、悠遊卡自動加值、三鐵轉運路線圖' },
  { id: 'trn_02', brand: 'transport', name: '台北車站(忠孝)公車專用道月台', lon: 121.5168, lat: 25.0461, x: -20, z: -5, addr: '中正區忠孝西路中央公車專用道', category: '公共交通地標', supply: '搭乘 307 幹線公車 (往中山/松江南京/板橋府中)' },
  { id: 'trn_03', brand: 'transport', name: '中山市場公車站牌', lon: 121.5218, lat: 25.0512, x: 78, z: -40, addr: '中山區中山北路一段', category: '公共交通地標', supply: '搭乘 307 幹線公車 (往台北車站/板橋)' },
  { id: 'trn_04', brand: 'transport', name: '板橋學府路一段公車站牌', lon: 121.4582, lat: 25.0108, x: -150, z: 168, addr: '板橋區學府路一段 (海山生活圈)', category: '公共交通地標', supply: '搭乘 656 / 99 / 307 幹線公車 (前往新板特區/台北車站)' },
  { id: 'trn_05', brand: 'transport', name: '捷運西門站公車站牌', lon: 121.5078, lat: 25.0428, x: -152, z: 25, addr: '萬華區中華路一段 (捷運西門站 6 號出口)', category: '公共交通地標', supply: '搭乘 656 / 307 / 9006 幹線公車 (前往台北車站 / 松江南京 / 基隆)' },
  { id: 'trn_06', brand: 'transport', name: '捷運松江南京站公車站牌', lon: 121.5332, lat: 25.0522, x: 155, z: -97, addr: '中山區南京東路二段 ✕ 松江路口', category: '公共交通地標', supply: '搭乘 307 幹線公車 (前往台北車站 / 板橋府中)' },
  { id: 'trn_07', brand: 'transport', name: '捷運台北車站 M6 出入口', lon: 121.5162, lat: 25.0458, x: 95, z: 15, addr: '中正區忠孝西路一段 66 號地下 (新光三越前)', category: '公共交通地標', supply: '台北捷運閘門 (板南線/淡水信義線固定班次列車)' },
  { id: 'trn_08', brand: 'transport', name: '捷運中山站 4 號出入口', lon: 121.5208, lat: 25.0528, x: 78, z: -95, addr: '中山區南京西路 16 號 (心中山線形公園)', category: '公共交通地標', supply: '台北捷運閘門 (淡水信義線/松山新店線固定班次列車)' },
  { id: 'trn_09', brand: 'transport', name: '捷運府中站 1 號出入口', lon: 121.4588, lat: 25.0085, x: -145, z: 210, addr: '板橋區縣民大道一段 193 號', category: '公共交通地標', supply: '台北捷運閘門 (板南線直通西門、台北車站與南港)' },
  { id: 'trn_10', brand: 'transport', name: '淡水河渡輪金色水岸棧道', lon: 121.4392, lat: 25.1705, x: -210, z: -95, addr: '淡水區金色水岸渡船頭', category: '公共交通地標', supply: '搭乘淡水渡輪 (往八里左岸 $34)' },
  { id: 'trn_11', brand: 'transport', name: '高鐵/台鐵/捷運南港車站 (特等樞紐)', lon: 121.6070, lat: 25.0531, x: 370, z: -60, addr: '南港區市民大道八段 8 號', category: '公共交通地標', supply: '四鐵共構特等樞紐，高鐵/台鐵/板南線列車轉乘' },
  { id: 'trn_12', brand: 'transport', name: '高鐵/台鐵/捷運板橋車站 (新北特等樞紐)', lon: 121.4638, lat: 25.0138, x: -130, z: 155, addr: '板橋區縣民大道二段 7 號', category: '公共交通地標', supply: '新北三鐵共構特等門戶，高鐵/縱貫鐵路/板南線/環狀線' },
  { id: 'trn_13', brand: 'transport', name: '基隆火車站港西街國道客運總站', lon: 121.7402, lat: 25.1325, x: 185, z: -220, addr: '基隆市港西街 5 號', category: '公共交通地標', supply: '搭乘 9006 基隆客運 (往圓山/士林) 或 1802 國光客運 (往三重)' },
  { id: 'lmk_01', brand: 'landmark', name: '國立臺灣博物館 (希臘多立克式宮殿)', lon: 121.5148, lat: 25.0428, x: -67.5, z: 66, addr: '中正區襄陽路 2 號 (二二八和平公園北側)', category: '公共交通地標', supply: '地質礦石標本檢驗借用、微型自然科學講堂' },
  { id: 'lmk_02', brand: 'landmark', name: '國定古蹟 景福門 (東門圓環)', lon: 121.5178, lat: 25.0385, x: 60, z: 108, addr: '中正區中山南路 ✕ 凱達格蘭大道口', category: '公共交通地標', supply: '台北城歷史拓撲石碑、古蹟測量定位點' },
  { id: 'lmk_03', brand: 'landmark', name: '國定古蹟 林本源園邸 (板橋林家花園)', lon: 121.4545, lat: 25.0112, x: -195, z: 210, addr: '板橋區西門街 9 號 (府中生活圈)', category: '公共交通地標', supply: '清代江南園林建築水系、板橋歷史古圖' }
];

// ──────────────────────────────────────────
// 2.5 雙北全境 41 行政特區 1:1 真實公園綠地全圖資 (SHUANGBEI_REAL_PARKS SSOT)
// 【落實委託人指示：如果這地方有公園也要有公園，整個雙北全部 1:1 實裝】
// ──────────────────────────────────────────
const SHUANGBEI_REAL_PARKS = [
  // ── 臺北市 12 核心行政特區代表性真實公園 ──
  { id: 'park_01', sectorId: 'TPE-01', name: '二二八和平紀念公園', lon: 121.5148, lat: 25.0402, x: 10, z: 50, w: 35, d: 35, category: '市區歷史綠地', features: '古樸拱橋水池、國立臺灣博物館、翠綠林蔭與露天音樂台' },
  { id: 'park_02', sectorId: 'TPE-01', name: '中正紀念堂民主公園', lon: 121.5198, lat: 25.0352, x: 65, z: 80, w: 45, d: 45, category: '國家級都會公園', features: '八角琉璃瓦主堂、光華池、雲漢池迴廊與春季櫻花步道' },
  { id: 'park_03', sectorId: 'TPE-02', name: '青年公園 (萬華最大綠地)', lon: 121.5052, lat: 25.0232, x: -140, z: 90, w: 42, d: 40, category: '都會運動公園', features: '萬坪大草坪、太空城堡水上設施、花鐘與林蔭運動跑道' },
  { id: 'park_04', sectorId: 'TPE-02', name: '華江雁鴨自然公園', lon: 121.4882, lat: 25.0342, x: -170, z: 70, w: 40, d: 35, category: '濕地生態公園', features: '大漢溪與新店溪匯流處、冬候鳥雁鴨水禽保護核心濕地' },
  { id: 'park_05', sectorId: 'TPE-03', name: '大稻埕延平河濱公園', lon: 121.5072, lat: 25.0562, x: -130, z: -105, w: 38, d: 30, category: '河濱水岸公園', features: '大稻埕碼頭貨櫃市集、淡水河夕陽水岸與自行車綠道' },
  { id: 'park_06', sectorId: 'TPE-04', name: '林森公園 ✕ 康樂公園', lon: 121.5262, lat: 25.0522, x: 80, z: -60, w: 32, d: 30, category: '市中心綠洲', features: '中山北路林森條通旁、日式鳥居遺跡與茂密樟樹森林' },
  { id: 'park_07', sectorId: 'TPE-04', name: '榮星花園公園', lon: 121.5402, lat: 25.0622, x: 130, z: -85, w: 36, d: 35, category: '生態花園公園', features: '螢火蟲復育水池、幾何歐式庭園與百株老榕綠蔭' },
  { id: 'park_08', sectorId: 'TPE-05', name: '大安森林公園 (台北市綠肺)', lon: 121.5352, lat: 25.0302, x: 110, z: 80, w: 60, d: 60, category: '特等都會森林公園', features: '26公頃萬坪森林穹頂、大型生態水鳥池、露天音樂劇場' },
  { id: 'park_09', sectorId: 'TPE-06', name: '象山親山步道公園 (中強公園)', lon: 121.5702, lat: 25.0302, x: 235, z: 50, w: 45, d: 45, category: '山林景觀公園', features: '台北樹蛙唯一保育地、台北101天際線無敵空拍視角' },
  { id: 'park_10', sectorId: 'TPE-07', name: '民生社區民生公園', lon: 121.5582, lat: 25.0582, x: 220, z: -85, w: 30, d: 30, category: '模範社區公園', features: '台北最早美式示範社區中心、綠蔭濃密與寧靜人文步道' },
  { id: 'park_11', sectorId: 'TPE-08', name: '大湖公園 (錦帶橋與落羽松)', lon: 121.6022, lat: 25.0832, x: 285, z: -165, w: 48, d: 45, category: '大型水域公園', features: '13公頃白鷺湖水域、水榭歌台、錦帶拱橋與落羽松森林' },
  { id: 'park_12', sectorId: 'TPE-08', name: '碧湖公園', lon: 121.5822, lat: 25.0812, x: 260, z: -155, w: 40, d: 38, category: '山水相映公園', features: '環湖登山步道、中式九曲橋涼亭與白鷺鷥棲息湖畔' },
  { id: 'park_13', sectorId: 'TPE-09', name: '南港公園 (能量氣場第一)', lon: 121.5932, lat: 25.0452, x: 370, z: -60, w: 45, d: 40, category: '高能量自然公園', features: '三面環山自然湖泊、中國古風牌樓、荷花池與天然林帶' },
  { id: 'park_14', sectorId: 'TPE-10', name: '士林官邸花園公園', lon: 121.5312, lat: 25.0942, x: -60, z: -210, w: 45, d: 42, category: '歷史花卉名園', features: '蔣公官邸古蹟、萬朵玫瑰園、中式八角亭與秋季菊展' },
  { id: 'park_15', sectorId: 'TPE-11', name: '北投溫泉親水公園', lon: 121.5062, lat: 25.1362, x: -160, z: -270, w: 42, d: 38, category: '地熱景觀公園', features: '北投溪地熱流水、綠建築北投圖書館、百年露天溫泉' },
  { id: 'park_16', sectorId: 'TPE-12', name: '木柵動物園綠帶水岸公園', lon: 121.5812, lat: 24.9982, x: 170, z: 230, w: 55, d: 50, category: '生態水岸綠帶', features: '景美溪道南河濱步道、貓空纜車站前綠廊與豐富鳥類生態' },

  // ── 新北市 29 全境行政特區代表性真實公園 ──
  { id: 'park_17', sectorId: 'NTP-01', name: '板橋萬坪都會公園', lon: 121.4622, lat: 25.0142, x: -130, z: 155, w: 45, d: 45, category: '新北特等都會公園', features: '新板特區站前核心大草坪、自然水景池與新北耶誕城主會場' },
  { id: 'park_18', sectorId: 'NTP-02', name: '新北大都會公園 (幸福水漾綠帶)', lon: 121.4782, lat: 25.0562, x: -260, z: -40, w: 70, d: 50, category: '全台最大水岸都會公園', features: '424公頃二重疏洪道綠地 (相當於16座大安森林公園)、熊猴森滑梯樂園' },
  { id: 'park_19', sectorId: 'NTP-03', name: '蘆洲微風運河生態公園', lon: 121.4682, lat: 25.0922, x: -250, z: -160, w: 50, d: 35, category: '水上運動公園', features: '國際級划船輕艇運河、水鳥保護濕地與成蘆大橋水岸綠道' },
  { id: 'park_20', sectorId: 'NTP-04', name: '新莊運動公園 (萬坪綠意景觀)', lon: 121.4482, lat: 25.0412, x: -310, z: 80, w: 55, d: 50, category: '綜合運動公園', features: '新莊棒球場體育館周邊、景觀湖、林蔭散步道與兒童遊樂場' },
  { id: 'park_21', sectorId: 'NTP-05', name: '中和八二三紀念公園 (四號公園)', lon: 121.5132, lat: 25.0012, x: -35, z: 175, w: 48, d: 45, category: '雙和最大綠肺', features: '國立臺灣圖書館坐落核心、茂密林蔭、活水池與溜冰場' },
  { id: 'park_22', sectorId: 'NTP-06', name: '永和仁愛公園 (綠寶石生態廊道)', lon: 121.5072, lat: 25.0112, x: -65, z: 135, w: 40, d: 40, category: '人文藝術公園', features: '永和唯二大型萬坪綠地、音樂露天劇場、咖啡座與雕塑園區' },
  { id: 'park_23', sectorId: 'NTP-07', name: '土城金城桐花公園', lon: 121.4502, lat: 24.9542, x: -120, z: 250, w: 45, d: 45, category: '山林生態公園', features: '承天禪寺上方、每年五月白雪桐花盛開、賞螢木棧道' },
  { id: 'park_24', sectorId: 'NTP-08', name: '樹林鹿角溪人工濕地公園', lon: 121.4282, lat: 24.9752, x: -220, z: 240, w: 45, d: 40, category: '濕地淨化生態公園', features: '大漢溪畔天然污水淨化池、水生植物復育與賞鳥木棧道' },
  { id: 'park_25', sectorId: 'NTP-09', name: '鶯歌三鶯桃花源 (三鶯水上舞台)', lon: 121.3532, lat: 24.9512, x: -330, z: 310, w: 45, d: 40, category: '陶瓷藝術親水公園', features: '大漢溪畔大型陶瓷公共藝術、三鶯藝術村與廣闊水岸草坪' },
  { id: 'park_26', sectorId: 'NTP-10', name: '三峽台北大學森林校園綠境', lon: 121.3722, lat: 24.9432, x: -260, z: 320, w: 50, d: 48, category: '大學城森林園區', features: '心湖美景、筆直落羽松大道與開放式校園綠意' },
  { id: 'park_27', sectorId: 'NTP-11', name: '新店陽光運動公園 (陽光橋畔)', lon: 121.5232, lat: 24.9822, x: 80, z: 270, w: 50, d: 45, category: '親水運動公園', features: '跨新店溪陽光橋、河津櫻花大道、四輪越野車場與沙灘排球場' },
  { id: 'park_28', sectorId: 'NTP-12', name: '淡水金色水岸公園', lon: 121.4392, lat: 25.1702, x: -230, z: -330, w: 45, d: 35, category: '歷史水岸景觀公園', features: '淡水老街沿岸、觀音山對渡夕照、海堤街頭藝人表演區' },
  { id: 'park_29', sectorId: 'NTP-13', name: '八里左岸水岸公園', lon: 121.4322, lat: 25.1612, x: -310, z: -300, w: 45, d: 35, category: '河海交會公園', features: '左岸碼頭帆船俱樂部、木棧道咖啡座、十三行文化公園' },
  { id: 'park_30', sectorId: 'NTP-14', name: '五股水碓觀景公園', lon: 121.4252, lat: 25.0712, x: -310, z: -80, w: 40, d: 40, category: '階梯森林景觀公園', features: '十層觀景斜坡步道、俯瞰台北盆地全景天際線與百萬夜景' },
  { id: 'park_31', sectorId: 'NTP-15', name: '泰山辭修公園', lon: 121.4252, lat: 25.0542, x: -340, z: 0, w: 38, d: 35, category: '林蔭階梯公園', features: '泰山明志路旁、200階林蔭石階、勝利女神飛彈陳列廣場' },
  { id: 'park_32', sectorId: 'NTP-16', name: '林口社區運動公園 (小熊公園)', lon: 121.3782, lat: 25.0782, x: -380, z: -180, w: 42, d: 42, category: '全齡遊戲公園', features: '小熊主題共融磨石滑梯、沙坑、溜冰場與多功能運動大草坪' },
  { id: 'park_33', sectorId: 'NTP-17', name: '汐止星光橋水岸公園', lon: 121.6702, lat: 25.0722, x: 390, z: -30, w: 45, d: 38, category: '基隆河地標公園', features: '單斜塔麥克風星光橋、基隆河自行車道、康誥坑溪櫻花步道' },
  { id: 'park_34', sectorId: 'NTP-18', name: '深坑萬福生態公園', lon: 121.6102, lat: 25.0012, x: 250, z: 210, w: 35, d: 35, category: '社區生態綠帶', features: '景美溪支流畔、木棧親水步道、油桐花樹與生態池' },
  { id: 'park_35', sectorId: 'NTP-19', name: '石碇千島湖景觀公園', lon: 121.6582, lat: 24.9352, x: 330, z: 260, w: 42, d: 40, category: '水源水庫景觀公園', features: '翡翠水庫上游碧綠湖泊、八卦茶園梯田與山林芬多精' },
  { id: 'park_36', sectorId: 'NTP-20', name: '坪林水岸親水公園', lon: 121.7122, lat: 24.9362, x: 370, z: 330, w: 42, d: 40, category: '清流茶鄉公園', features: '北勢溪觀魚步道、坪林拱橋、苦花魚生態復育景觀' },
  { id: 'park_37', sectorId: 'NTP-21', name: '三芝淺水灣海濱公園', lon: 121.4752, lat: 25.2422, x: -290, z: -410, w: 45, d: 35, category: '北海岸海景公園', features: '平緩海灣沙灘、海景咖啡步道、芝蘭公園海上延伸平台' },
  { id: 'park_38', sectorId: 'NTP-22', name: '老梅綠石槽海岸公園 (石門極北)', lon: 121.5432, lat: 25.2922, x: -220, z: -450, w: 45, d: 35, category: '火山海岸地質公園', features: '全台唯一綠石槽火山岩地質、富貴角燈塔極北海岸步道' },
  { id: 'park_39', sectorId: 'NTP-23', name: '金山獅頭山公園 (燭臺雙嶼)', lon: 121.6492, lat: 25.2282, x: -150, z: -420, w: 45, d: 42, category: '海岬景觀公園', features: '標高70公尺海岬絕景、夫妻石燭臺雙嶼、磺港漁火景觀' },
  { id: 'park_40', sectorId: 'NTP-24', name: '野柳地質公園 (女王頭奇岩)', lon: 121.6912, lat: 25.2062, x: 70, z: -420, w: 48, d: 45, category: '世界級地質奇觀', features: '千百萬年海蝕女王頭、蕈狀岩、豆腐岩與單面山地質' },
  { id: 'park_41', sectorId: 'NTP-25', name: '猴硐煤礦生態園區 (貓村公園)', lon: 121.8282, lat: 25.0862, x: 480, z: -60, w: 45, d: 40, category: '礦業文化生態公園', features: '基隆河壺穴地質、瑞三礦業整煤廠遺址、猴硐貓咪保育園區' },
  { id: 'park_42', sectorId: 'NTP-26', name: '十分瀑布風景公園 (台灣尼加拉)', lon: 121.7872, lat: 25.0482, x: 430, z: 160, w: 45, d: 40, category: '國家級瀑布公園', features: '全台最大簾幕式瀑布、眼鏡洞壺穴地形、平溪線鐵道吊橋' },
  { id: 'park_43', sectorId: 'NTP-27', name: '雙溪虎豹潭風景區公園', lon: 121.8482, lat: 24.9752, x: 490, z: 220, w: 40, d: 40, category: '深潭清流生態公園', features: '北勢溪北支流源頭、深潭如鏡、天然方塊步石與森林步道' },
  { id: 'park_44', sectorId: 'NTP-28', name: '福隆海濱公園 (沙雕藝術園區)', lon: 121.9452, lat: 25.0212, x: 560, z: 210, w: 48, d: 42, category: '黃金沙灘海洋公園', features: '雙溪河出海口內外雙灘、彩虹彎橋、國際沙雕藝術節園區' },
  { id: 'park_45', sectorId: 'NTP-29', name: '烏來瀑布景觀公園', lon: 121.5512, lat: 24.8482, x: 110, z: 380, w: 48, d: 45, category: '高山溫泉峽谷公園', features: '落差80公尺烏來高空瀑布、烏來台車山林鐵道、南勢溪地熱' }
];

// ──────────────────────────────────────────
// 3. 108 課綱自然科學探究 10 大示範案件全景矩陣 (Demonstration Cases SSOT)
// 【落實顧問 50 指示：加註校園教學安全替代教具，杜絕毒物疑慮】
// ──────────────────────────────────────────
const DEMO_10_CASES = [
  {
    id: 'CASE-01',
    num: '01',
    title: '西門老牌連鎖咖啡雙倍濃縮拿鐵案',
    subtitle: '液體密度差分層沉降與溶解度推論',
    sectorId: 'TPE-02',
    sectorName: '萬華特區・西門町徒步商圈',
    location: '萬華區漢中街 52 號 (蜂大咖啡旁)',
    lon: 121.507,
    lat: 25.043,
    worldX: -148,
    worldZ: 42,
    subject: '國中理化／國小自然（密度與溶液）',
    scienceConcept: '不同液體因密度差異（濃糖水 > 全脂牛奶 > 濃縮咖啡液）產生界面分層；未攪拌前分層清楚，攪拌後混合均勻。',
    curriculumMapping: '108課綱【INb-Ⅲ-2】物質的性質與形態改變；【INd-Ⅲ-1】水溶液的酸鹼性與溶質特性。',
    safeClassroomKit: '【校園無毒替代安全教具】：完全無害！採用食用級楓糖漿（底層）、鮮奶/豆漿（中層）、紅茶/無咖啡因麥茶（上層），使用安全透明刻度量筒或環保紙杯進行密度分層觀察，絕無化學毒物與強酸強鹼風險。',
    brief: '西門町連鎖咖啡店內，常客陳經理在喝下特調雙倍濃縮拿鐵後突然出現胸悶與暈眩症狀。吧檯留有只喝了上層的未攪拌拿鐵，嫌犯宣稱「這杯飲料是整杯一起倒的，大家喝都一樣」。',
    suspects: [
      { name: '林店長', role: '當班店長', motive: '與傷者有勞資加盟爭議，經手濃糖漿調配。' },
      { name: '王服務生', role: '外場工讀生', motive: '端送咖啡時曾被傷者斥責，宣稱自己只是端過去。' },
      { name: '張同桌業務', role: '合約競爭對手', motive: '趁傷者離席講電話時坐在對面，口袋有不明滴管。' }
    ],
    investigationSteps: [
      '步驟 1：使用滴管在透明量筒中依序滴入三種密度液體，觀察分層物理現象。',
      '步驟 2：比對未攪拌咖啡杯上層殘留物，檢測其表面張力與折射率。',
      '步驟 3：調取店內監視器，比對嫌犯出手投藥瞬間的液面擾動時間點。'
    ],
    conclusion: '嫌疑人在傷者離席時，將高密度濃縮液自吸管口注入底層；由於未經均勻攪拌，上層與底層溶質濃度相差達 8.4 倍，當場戳破嫌犯「整杯濃度均勻」的謊言！'
  },
  {
    id: 'CASE-02',
    num: '02',
    title: '北車忠孝西路地下道虹吸水壓失衡案',
    subtitle: '大氣壓力、密閉管路與虹吸原理探究',
    sectorId: 'TPE-01',
    sectorName: '中正特區・台北車站站前樞紐',
    location: '中正區忠孝西路一段 49 號 (M6 出入口地下連通道)',
    lon: 121.517,
    lat: 25.046,
    worldX: 15,
    worldZ: 18,
    subject: '國中理化（大氣壓力與流體力學）',
    scienceConcept: '虹吸現象（Siphon Principle）：利用液體分子間內聚力與大氣壓力差，使得液體跨越高處流向低處容器。',
    curriculumMapping: '108課綱【INe-Ⅲ-4】力與運動；【INc-Ⅳ-3】流體壓力與浮力平衡。',
    safeClassroomKit: '【校園無毒替代安全教具】：採用普通透明軟水管（長 80cm）、兩只 500ml 壓克力量杯、食用紅色色素水。學生可在洗手台安全操作，直觀觀察高低差產生自發流動。',
    brief: '台北車站地下連通管道因不明積水導致防汛閘門警報大作，機房抽水幫浦電線被切斷。現場留有一條看似隨意丟棄的細長塑膠洗車管，跨越 1.2 公尺高的機房防洪矮牆。',
    suspects: [
      { name: '周水電包商', role: '維修技工', motive: '因維護合約即將到期，企圖營造機房不可或缺的維修需求。' },
      { name: '何站務助理', role: '機房巡檢員', motive: '當班簽到作假，宣稱積水是地下滲水造成。' }
    ],
    investigationSteps: [
      '步驟 1：量測矮牆兩側水位高低落差（$\Delta h = 45\text{ cm}$）。',
      '步驟 2：勘驗塑膠軟管內部殘留水質與氣泡排除狀態，確認虹吸啟動條件。',
      '步驟 3：比對出水口流量與防汛水槽容量，推算虹吸作案啟動時間。'
    ],
    conclusion: '水不可能自發爬過 1.2 公尺高牆，但嫌犯預先將管內注滿水並壓低出水口，利用大氣壓虹吸效應自動抽水淹沒電線，自製人為事故被揭穿！'
  },
  {
    id: 'CASE-03',
    num: '03',
    title: '大安森林公園紅土泥地受力壓痕案',
    subtitle: '受力面積、壓強公式 $P=F/A$ 與鞋印深度',
    sectorId: 'TPE-05',
    sectorName: '大安特區・森林穹頂生態公園',
    location: '大安區新生南路二段 1 號 (生態池木棧道旁紅土徑)',
    lon: 121.535,
    lat: 25.031,
    worldX: 118,
    worldZ: 78,
    subject: '國小自然／國中理化（受力面積與壓力）',
    scienceConcept: '固體壓強 $P = F / A$：在總重量（正向力 $F$）相同情況下，受力面積 $A$ 越小，產生的凹陷深度越深。',
    curriculumMapping: '108課綱【INe-Ⅲ-1】接觸力與非接觸力；【INe-Ⅲ-3】力的效應與形變測量。',
    safeClassroomKit: '【校園無毒替代安全教具】：採用無毒兒童黏土/油黏土、自製塑膠格網鞋底印模、標準 500g 砝碼或水瓶。透過不同接觸面積受力壓下黏土，測量游標卡尺壓痕深度，百分之百無危險。',
    brief: '大安森林公園生態池木棧道旁昨夜發生珍稀保育類鳥蛋失竊案。昨夜剛下大雨，泥地上留下兩組深度截然不同的相同 42 號運動鞋鞋印：一組深達 18mm，另一組僅 6mm。',
    suspects: [
      { name: '趙慢跑者', role: '清晨晨跑民眾', motive: '體重 68kg，宣稱自己整夜都在公園跑步。' },
      { name: '孫攝影玩家', role: '生態攝影師', motive: '隨身背負沉重金屬防潮箱（重達 24kg），宣稱未曾踏入紅土區。' }
    ],
    investigationSteps: [
      '步驟 1：使用石膏模型翻模提取鞋印底紋與受力面積（約 $220\text{ cm}^2$）。',
      '步驟 2：透過黏土壓痕標定曲線，計算使紅土下陷 18mm 所需之等效垂直壓力（約 $92\text{ kgw}$）。',
      '步驟 3：比對嫌犯空身與背負防潮箱時之總體重量。'
    ],
    conclusion: '鞋印尺碼雖然完全相同，但深達 18mm 的鞋印顯示負重高達 90kg 以上，正符合趙嫌背負裝滿失竊器材與保溫箱的總重，成功破解不在場謊言！'
  },
  {
    id: 'CASE-04',
    num: '04',
    title: '萬華龍山寺百年青草茶酸鹼變色案',
    subtitle: '天然植物花青素指示劑與酸鹼中和反應',
    sectorId: 'TPE-02',
    sectorName: '萬華特區・艋舺歷史街廓',
    location: '萬華區西昌街 224 巷 (青草巷百年老鋪)',
    lon: 121.499,
    lat: 25.037,
    worldX: -145,
    worldZ: 48,
    subject: '國小自然（水溶液的酸鹼性質）',
    scienceConcept: '天然植物色素（花青素、酚類）隨水溶液 pH 值改變其分子共軛結構，在酸性呈紅色/紫紅、中性呈紫色/深綠、鹼性呈黃綠色。',
    curriculumMapping: '108課綱【INd-Ⅲ-1】水溶液的酸鹼性與酸鹼指示劑（石蕊、紫甘藍、蝶豆花）。',
    safeClassroomKit: '【校園無毒替代安全教具】：採用食用級天然紫甘藍自製菜汁、食用純小蘇打粉（弱鹼）、天然檸檬汁（弱酸），調配於滴管與白瓷點滴盤。全天然食材，可觸摸且絕無化學傷害。',
    brief: '青草巷比賽奪冠的祖傳秘方茶湯在展覽會場突然變成暗綠色並產生澀味，主辦單位懷疑遭人下毒破壞。現場攤位僅留下一罐未貼標籤的白色透明液體。',
    suspects: [
      { name: '吳競爭對手', role: '隔壁茶莊老闆', motive: '被目擊在展台旁洗手，宣稱用的是普通自來水。' },
      { name: '陳清潔工', role: '會場外包人員', motive: '推車上放有稀釋小蘇打漂白除垢水。' }
    ],
    investigationSteps: [
      '步驟 1：取變色青草茶樣品，滴入天然檸檬汁，觀察顏色是否逆轉回琥珀紅。',
      '步驟 2：使用廣用試紙與天然甘藍汁對照色卡，測出茶湯 pH 值由原本 5.8 異常升至 8.6。',
      '步驟 3：在展台邊緣採集白色擦拭抹布殘留物進行酸鹼滴定反應。'
    ],
    conclusion: '青草茶本身含有大量天然植物酚，被倒入鹼性小蘇打清洗液後產生酸鹼相變由紅轉綠；吳嫌企圖以自來水掩飾鹼性液體的事實不攻自破！'
  },
  {
    id: 'CASE-05',
    num: '05',
    title: '新北板橋學府路生鮮冷鏈凝露案',
    subtitle: '空氣露點溫度、相對濕度與水氣相變',
    sectorId: 'NTP-01',
    sectorName: '板橋特區・新北總部 (學府1:1真實商圈)',
    location: '板橋區學府路一段 146 號 (樂家康超市便利購門市前)',
    lon: 121.458,
    lat: 25.010,
    worldX: -130,
    worldZ: 155,
    subject: '國中理化／國小自然（水的三態變化與天氣）',
    scienceConcept: '空氣中容納水蒸氣有飽和極限；當溫暖潮濕空氣接觸低於露點（Dew Point）的低溫物體表面時，水蒸氣凝結成液態水珠（結露現象）。',
    curriculumMapping: '108課綱【INb-Ⅲ-1】三態變化與吸放熱；【INg-Ⅲ-1】天氣現象（雲、霧、露、霜）。',
    safeClassroomKit: '【校園無毒替代安全教具】：金屬不鏽鋼杯、食用冰塊、常溫自來水、電子溫度計。在杯中逐次加冰攪拌，記錄金屬外壁第一顆露珠凝結瞬間之水溫，即為現場空氣露點。',
    brief: '樂家康學府店前進貨的一批高單價生鮮松露外包裝全部受潮損毀，物流司機堅稱全程冷藏且「保證從未打開過密封保溫箱」。然而紙箱內壁卻乾爽，只有塑膠膜外側結滿厚重水珠。',
    suspects: [
      { name: '錢貨車司機', role: '外包冷鏈車司機', motive: '途中曾熄火停車 40 分鐘去吃麵，疑將冷氣關閉。' },
      { name: '李店內理貨員', role: '早班驗收人員', motive: '驗收延誤 15 分鐘，被指責將貨物曬在豔陽下。' }
    ],
    investigationSteps: [
      '步驟 1：使用溫濕度計量測當日板橋戶外氣溫（$32^\circ\text{C}$）與相對濕度（$82\%$），查露點查表得露點為 $28.5^\circ\text{C}$。',
      '步驟 2：檢驗冷鏈行車記錄器溫度感測日誌，比對箱內回溫曲線。',
      '步驟 3：模擬低溫包裝箱移至高溫高濕戶外環境之結露速率。'
    ],
    conclusion: '若是箱內物品腐壞出水，水分應由內向外滲透；但現場只有外側結露，證明貨物在低於露點低溫下被提早暴露於戶外熱濕空氣中，揭穿司機偽造全程未開箱記錄！'
  },
  {
    id: 'CASE-06',
    num: '06',
    title: '內湖高能運算園區伺服器散熱對流案',
    subtitle: '熱傳導、熱對流與機房冷熱通道風流',
    sectorId: 'TPE-08',
    sectorName: '內湖特區・內科高能計算園區',
    location: '內湖區瑞光路 399 號 (內科雲端大樓 7F 機房)',
    lon: 121.576,
    lat: 25.078,
    worldX: 270,
    worldZ: -160,
    subject: '國中理化（熱的傳播方式）',
    scienceConcept: '流體（空氣）受熱體積膨脹、密度變小而上升，冷空氣密度大而下沉，形成「熱對流」；冷熱通道隔離可最大化散熱效率。',
    curriculumMapping: '108課綱【INb-Ⅲ-5】熱傳遞的三種方式（傳導、對流、輻射）。',
    safeClassroomKit: '【校園無毒替代安全教具】：壓克力對流展示箱、食用級溫感變色貼紙、小型 USB 靜音風扇、無毒甘油微型造煙筆（或吹泡泡水流速觀察）。完全無明火無高溫燙傷風險。',
    brief: '內科高能園區中央算力伺服器昨夜觸發極度高溫警報當機，維運人員發現主要冷風進氣口被一塊壓克力擋板倒置遮蔽，冷熱風道逆流形成熱積聚迴圈。',
    suspects: [
      { name: '方資深網管', role: '即將離職工程師', motive: '因獎金發放與公司有糾紛，擁有最高出入權限。' },
      { name: '杜清潔外包', role: '大樓夜間保潔', motive: '稱自己只是擦拭機櫃玻璃，不小心碰倒擋板。' }
    ],
    investigationSteps: [
      '步驟 1：在縮小機櫃模型中貼附溫感變色貼紙，模擬冷風與熱風循環死角。',
      '步驟 2：使用造煙流線觀察擋板角度對熱對流渦流形成的影響。',
      '步驟 3：比對當機時段 16 組感溫探針熱力圖擴散方向。'
    ],
    conclusion: '擋板安裝角度為精密的 $45^\circ$ 反流偏轉角，只有深諳流體力學與熱對流通道的專業工程師才能蓄意設計，純屬擦拭意外的藉口不攻自破！'
  },
  {
    id: 'CASE-07',
    num: '07',
    title: '新店碧潭水電中樞連通管水位失衡案',
    subtitle: '連通管原理、靜水壓與液柱高度平衡',
    sectorId: 'NTP-11',
    sectorName: '新店特區・碧潭水電生態特區',
    location: '新店區碧潭路 1 號 (碧潭堰水能觀測站)',
    lon: 121.537,
    lat: 24.956,
    worldX: 80,
    worldZ: 270,
    subject: '國小自然／國中理化（大氣壓力與液體壓力）',
    scienceConcept: '連通管原理（Communicating Vessels）：同一種靜止液體在相連通的容器中，無論容器形狀大小，各液面必然維持在同一水平高度。',
    curriculumMapping: '108課綱【INe-Ⅲ-4】力與平衡；【INc-Ⅳ-3】流體壓力連通管性質。',
    safeClassroomKit: '【校園無毒替代安全教具】：不同形狀之壓克力連通管組合（粗細管、彎管、球形管）、彩色食用色素自來水。學生注水即可親眼驗證各管口水平線等高，操作安全衛生。',
    brief: '碧潭水能觀測站兩座原本連通的儲水調節池，在進行排洪演練時，左池水位竟比右池異常高出 85 公分，造成水輪發電機逆向過載。現場聯通閥門手柄顯示「已全開」。',
    suspects: [
      { name: '彭水利技師', role: '值班調度員', motive: '疑有賭博欠債，收受下游砂石業者不正利益。' },
      { name: '徐巡檢志工', role: '地方文史環保志工', motive: '反對碧潭人工調節水位破壞水鳥棲地。' }
    ],
    investigationSteps: [
      '步驟 1：檢驗兩池表面大氣通氣孔，發現左池氣壓閥被逆止封死，產生密閉氣墊阻抗。',
      '步驟 2：以 U 型壓力計量測左池頂部密閉氣壓差（$\Delta P = \rho g \Delta h$）。',
      '步驟 3：比對閥門機械鎖死痕跡與工具箱內特殊規格扳手。'
    ],
    conclusion: '在開放連通管中兩側液面必等高；但若刻意封閉一端氣孔，內部被壓縮空氣將產生反壓阻擋水面上升。彭技師利用物理氣墊偷改連通管條件的破壞手段被查實！'
  },
  {
    id: 'CASE-08',
    num: '08',
    title: '南港生技光谷酵素低溫活性失常案',
    subtitle: '生物酵素受熱蛋白質變性與催化活性喪失',
    sectorId: 'TPE-09',
    sectorName: '南港特區・生技光谷軟體園區',
    location: '南港區研究院路一段 130 號 (國家生技研究園區)',
    lon: 121.614,
    lat: 25.041,
    worldX: 370,
    worldZ: -60,
    subject: '國中生物／國小自然（生物體的組成與酵素作用）',
    scienceConcept: '酵素（Enzyme）為蛋白質催化劑；超過最適溫度（如 $>60^\circ\text{C}$）會造成蛋白質三度空間立體結構變性（Denaturation），永久失去催化活性。',
    curriculumMapping: '108課綱【INc-Ⅲ-1】生物體代謝作用；【INc-Ⅳ-1】酵素的專一性與環境影響因子（溫度、pH）。',
    safeClassroomKit: '【校園無毒替代安全教具】：食用活性乾酵母粉、溫水、食用雙氧水（稀釋 3% 安全藥局消毒水）、氣球與量筒。觀察酵母催化分解雙氧水產生氧氣將氣球吹大的速率，完全合規且安全。',
    brief: '生技光谷實驗室一批即將交付臨床試驗的無毒生物分解酵素樣品，送達時檢測發現其催化活性歸零。防潮冷藏箱溫度記錄器顯示「始終維持在 $4^\circ\text{C}$ 低溫」。',
    suspects: [
      { name: '韓研究副手', role: '論文第二作者', motive: '嫉妒計畫主持人升遷，企圖使專利案因期限失效。' },
      { name: '陸快遞專員', role: '特規冷鏈物流員', motive: '急著趕路曾違規穿越微波熱源發射測試區。' }
    ],
    investigationSteps: [
      '步驟 1：使用光譜儀分析蛋白質立體摺疊態，證實該批酵素曾經歷過至少 $68^\circ\text{C}$ 之短暫熱衝擊。',
      '步驟 2：解剖防潮箱溫度記錄器，發現其熱敏電阻被串聯電阻並聯旁路，固定鎖死於低溫電阻值。',
      '步驟 3：在實驗室微波烘乾機內採集到同批微量酵素殘渣。'
    ],
    conclusion: '蛋白質變性不可逆！嫌犯偽造低溫冷藏日誌，但在微波加熱過程中改變了酵素的分子立體構型，科學鐵證讓嫌疑人啞口無言！'
  },
  {
    id: 'CASE-09',
    num: '09',
    title: '淡水金色水岸船舶擱淺潮汐落差案',
    subtitle: '月球引潮力、潮汐週期與乾潮滿潮時序',
    sectorId: 'NTP-12',
    sectorName: '淡水特區・數位水能港灣',
    location: '淡水區中正路 65 號 (金色水岸渡船頭碼頭)',
    lon: 121.439,
    lat: 25.171,
    worldX: -230,
    worldZ: -330,
    subject: '國小自然／國中地科（月相、引力與潮汐）',
    scienceConcept: '潮汐（Tides）：月球與太陽對地球海水的萬有引力差（引潮力）產生半日潮週期（約 12 小時 25 分）；初一、十五為大潮（朔望大潮）。',
    curriculumMapping: '108課綱【INg-Ⅲ-4】日地月運動與月相變化；【INg-Ⅳ-2】海水的運動與潮汐現象。',
    safeClassroomKit: '【校園無毒替代安全教具】：中央氣象署公開潮汐圖表手冊、三球儀（日地月運轉模型）、透明壓克力水箱手動傾角儀。透過真實大數據比對潮高變化，安全零耗材。',
    brief: '一艘滿載昂貴電子零件的觀光快艇昨夜在金色水岸淺灘嚴重擱淺進水，船長向保險公司索賠 1200 萬元，聲稱「遭遇突發異常海嘯式退潮，完全無法預料」。',
    suspects: [
      { name: '洪快艇船長', role: '資深引水員', motive: '快艇有龐大貸款壓力，近期投保超高額海事險。' },
      { name: '龔碼頭調度員', role: '晚班港務人員', motive: '與船長私下有資金借貸往來。' }
    ],
    investigationSteps: [
      '步驟 1：調閱淡水港中央氣象署即時驗潮儀數據，比對當日農曆初一朔日之大潮水位差（高達 2.6 公尺）。',
      '步驟 2：推算快艇吃水深度（1.4 公尺）與乾潮時刻（22:18）的河道水深（僅 0.8 公尺）。',
      '步驟 3：比對船隻航行日誌與 GPS 軌跡，發現其在乾潮前 15 分鐘全速駛入明知必乾涸之泥灘區。'
    ],
    conclusion: '朔望大潮為必然的天體物理週期，潮汐退減速率與時間早在航海潮汐表精確載明；船長蓄意在最低乾潮時衝入淺灘製造「天災」詐保被天文地科數據無情打臉！'
  },
  {
    id: 'CASE-10',
    num: '10',
    title: '大同迪化乾貨街海鹽過飽和結晶案',
    subtitle: '溶解度曲線、過飽和溶液與溫度結晶析出',
    sectorId: 'TPE-03',
    sectorName: '大同特區・大稻埕南北貨街廓',
    location: '大同區迪化街一段 120 號 (百年乾貨中藥行)',
    lon: 121.510,
    lat: 25.056,
    worldX: -110,
    worldZ: -110,
    subject: '國小自然／國中理化（溶液的溶解度與結晶）',
    scienceConcept: '固體溶質在水中溶解度通常隨溫度升高而增加；高溫飽和溶液降溫時，溶解度下降，多餘溶質析出成為規則幾何晶體（結晶現象）。',
    curriculumMapping: '108課綱【INb-Ⅲ-2】物質溶解與飽和；【INd-Ⅲ-2】晶體的析出與分離純化。',
    safeClassroomKit: '【校園無毒替代安全教具】：食用級粗海鹽/白糖、500ml 玻璃燒杯、塑膠攪拌棒、放大鏡或手持顯微鏡、熱水（教師代為操作保溫瓶熱水）。觀察六面體立方食鹽晶體析出，安心且具教學美感。',
    brief: '迪化街一罈宣稱保存 60 年的「深海極品老滷汁」在拍賣會上以天價結標，但得標者打開後發現甕底結滿大塊立方晶體，懷疑老滷汁被偷換成普通熱鹽水摻假。',
    suspects: [
      { name: '嚴拍賣顧問', role: '鑑定專家', motive: '收取拍賣佣金，急於在店家歇業前脫手。' },
      { name: '丁學徒小弟', role: '店內幫工', motive: '前晚曾被看見在廚房大量熬煮食鹽水。' }
    ],
    investigationSteps: [
      '步驟 1：取晶體置於顯微鏡下觀察幾何外型，確認為高純度氯化鈉等軸晶系（立方體）。',
      '步驟 2：利用溶解度曲線測量該溶液在 $20^\circ\text{C}$ 與 $80^\circ\text{C}$ 之濃度變化，推算人為加鹽量。',
      '步驟 3：化驗晶體內天然有機物雜質含量，老滷汁晶體應包裹豐富胺基酸，但該晶體純度高達 $99.8\%$。'
    ],
    conclusion: '真正的陳年老滷汁含高濃度有機物與膠質，極不易析出純淨立方鹽晶；嫌犯前夜用熱水溶解工業鹽後急速冷卻冒充老滷，結晶純度露出了破綻！'
  }
];

// ──────────────────────────────────────────
// 4. 輔助工具函式
// ──────────────────────────────────────────
function getCaseById(caseId) {
  return DEMO_10_CASES.find(c => c.id === caseId);
}

function getSectorById(sectorId) {
  return SHUANGBEI_41_SECTORS.find(s => s.id === sectorId || s.code === sectorId);
}

// 供 Node.js 環境相容匯出 (若有需要)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHUANGBEI_41_SECTORS,
    REAL_WORLD_STORES,
    SHUANGBEI_REAL_PARKS,
    DEMO_10_CASES,
    getCaseById,
    getSectorById
  };
}
