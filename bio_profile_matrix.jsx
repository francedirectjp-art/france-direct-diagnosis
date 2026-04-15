/**
 * bio_profile_matrix.jsx
 * 
 * Bio-Profile 16-Type Matrix Reference File
 * ==========================================
 * 
 * This file serves as the implementation reference for the Bio-Profile analysis system.
 * It defines the 16-type body constitution matrix based on Sun Element x Moon Element combinations.
 * 
 * DATABASE SCHEMA:
 * ----------------
 * Data is stored in the Supabase 'diagnoses' table with the following structure:
 * 
 *   Table: diagnoses
 *   ├── id (uuid, primary key, auto-generated)
 *   ├── client_name (text) - User's name
 *   ├── meeting_date (date) - Date of analysis
 *   ├── created_at (timestamp) - Auto-generated timestamp
 *   ├── answers (jsonb) - Raw questionnaire responses { "1": 0-3, "2": 0-3, ... "40": 0-3 }
 *   └── scores (jsonb) - All computed data:
 *       ├── liver, gut, kidney, circ (0-100) - Final hybrid scores
 *       ├── innate_liver, innate_gut, innate_kidney, innate_circ (0-100) - Birth-date derived
 *       ├── symptom_liver, symptom_gut, symptom_kidney, symptom_circ (0-100) - Questionnaire derived
 *       ├── sun_element, moon_element (fire|earth|water|wind) - Hidden astrology engine
 *       ├── sun_sign, moon_sign (zodiac name) - Calculated from birth date
 *       ├── birth_date, birth_time, gender - Profile info
 *       ├── body_type_name, body_type_subtitle - 16-type classification
 *       ├── profile_type (critical|latent|lifestyle|balanced) - Risk profile
 *       ├── primary_organ, secondary_organ - Top 2 risk organs
 *       ├── moon_confidence (0-1) - Moon sign validation score
 *       ├── type_data { symptoms[], cascade, detox, desc } - Type details
 *       └── source: 'bio_profile_v1' - Version marker
 * 
 * ELEMENT ENCODING:
 *   fire=1, earth=2, water=3, wind=4
 * 
 * HYBRID SCORING FORMULA:
 *   Final = 0.45 * innate_risk + 0.45 * current_symptoms + 0.10 * cross_factor * 10
 *   cross_factor:
 *     innate > 50 && current > 50 → 15 (reinforced risk)
 *     innate > 70 && current < 30 → 8 (hidden/latent risk)
 *     innate < 30 && current > 70 → 5 (lifestyle-induced)
 *     else → 0
 * 
 * COACH ACCESS:
 *   coach.html reads from db.from('diagnoses').select('*')
 *   Bio-profile entries are identified by scores.source === 'bio_profile_v1'
 */

const ELEMENTS = {
  fire:  { code: 1, label: '火', organ: '肝臓', system: '解毒・代謝', color: '#e05040' },
  earth: { code: 2, label: '土', organ: '腸', system: '消化・吸収・排泄', color: '#d0a030' },
  water: { code: 3, label: '水', organ: '腎臓', system: '濾過・水分調整', color: '#3088d0' },
  wind:  { code: 4, label: '風', organ: '循環・神経系', system: '血管・自律神経', color: '#30b870' },
};

const ZODIAC_GROUPS = {
  fire:  ['aries', 'leo', 'sagittarius'],
  earth: ['taurus', 'virgo', 'capricorn'],
  water: ['cancer', 'scorpio', 'pisces'],
  wind:  ['gemini', 'libra', 'aquarius'],
};

const TYPES = [
  // ─── SUN: FIRE ────────────────────────────────
  { sun:'fire', moon:'fire', name:'過燃焼タイプ', subtitle:'肝臓フル稼働 × ストレスでさらに肝臓加速',
    riskLiver:95, riskGut:15, riskKidney:20, riskCirc:30,
    desc:'常にエネルギー全開で肝臓を酷使し、ストレス時にもブレーキが利かず肝臓に二重負荷がかかる。',
    symptoms:['慢性的な倦怠感・朝起きられない','目の充血・ドライアイ','肌の黄ぐすみ・吹き出物','アルコールに弱くなった実感','右肋骨下の鈍い張り'],
    cascade:'肝臓の解毒処理が追いつかなくなると、未処理の毒素が血流に乗って全身に拡散。',
    detox:'肝臓を最優先で休ませるファスティング。苦味のあるハーブ（ダンデライオン・ミルクシスル系）が鍵。' },
  { sun:'fire', moon:'earth', name:'代謝過負荷 → 腸崩壊タイプ', subtitle:'肝臓酷使 × ストレスで腸に波及',
    riskLiver:80, riskGut:75, riskKidney:15, riskCirc:20,
    desc:'日常的に肝臓をフル回転させて活動するが、追い込まれると腸で受け止める。',
    symptoms:['ストレス時の過食・暴飲暴食','便秘と下痢を交互に繰り返す','腹部膨満感・ガスが溜まりやすい','肌荒れ（特に顎周り）','食後の強い眠気'],
    cascade:'肝臓が処理しきれない毒素が胆汁を通じて腸に大量流入。',
    detox:'まず肝臓の負担を軽減するファスティング後、腸内フローラ再建。' },
  { sun:'fire', moon:'water', name:'代謝過負荷 → 腎臓沈没タイプ', subtitle:'肝臓酷使 × ストレスで腎臓に波及',
    riskLiver:80, riskGut:20, riskKidney:70, riskCirc:25,
    desc:'エネルギッシュに肝臓を使い込むが、精神的に追い詰められると腎臓・水分代謝系が崩壊する。',
    symptoms:['ストレス時の強いむくみ','夜間頻尿・尿の色の変化','腰の重だるさ・冷え','感情を我慢した後の体調崩壊','耳鳴り・めまい'],
    cascade:'肝臓で代謝された老廃物の最終処理を腎臓が担うが、ストレスで腎血流が低下。',
    detox:'肝臓ファスティング後に腎臓サポート。利尿作用のあるハーブ（ネトル・ジュニパー系）。' },
  { sun:'fire', moon:'wind', name:'代謝過負荷 → 神経過敏タイプ', subtitle:'肝臓酷使 × ストレスで循環・神経に波及',
    riskLiver:80, riskGut:15, riskKidney:20, riskCirc:65,
    desc:'行動力全開で肝臓を消耗させ、疲れが溜まると自律神経と血管系が乱れる。',
    symptoms:['突然の動悸・息切れ','不眠・入眠困難','手足の冷え','頭痛（特に側頭部）','集中力の急激な低下'],
    cascade:'肝臓の過負荷で血液の質が低下→自律神経のバランス崩壊。',
    detox:'肝臓デトックスを最優先しつつ、神経系を鎮めるハーブ（パッションフラワー・リンデン系）を併用。' },

  // ─── SUN: EARTH ───────────────────────────────
  { sun:'earth', moon:'fire', name:'消化依存 → 肝臓炎上タイプ', subtitle:'腸を酷使 × ストレスで肝臓が燃え上がる',
    riskLiver:70, riskGut:75, riskKidney:15, riskCirc:20,
    desc:'消化吸収に体力の多くを費やすタイプ。ストレスがかかると肝臓に一気に火がつく。',
    symptoms:['消化に時間がかかる・胃もたれ','ストレス時の怒りの爆発','便秘がちで毒素が再吸収','右肩の凝り','甘いものへの強い渇望'],
    cascade:'腸で吸収された栄養の処理が肝臓に集中。腸内環境悪化で未消化物が肝臓に大量流入。',
    detox:'腸のクレンジングが最優先。その後、肝臓の解毒力を回復させる二段階アプローチ。' },
  { sun:'earth', moon:'earth', name:'消化器集中負荷タイプ', subtitle:'腸フル稼働 × ストレスでも腸に集中',
    riskLiver:10, riskGut:95, riskKidney:10, riskCirc:10,
    desc:'あらゆる不調が消化器系に集約される体質。腸さえ整えば全身が劇的に改善する。',
    symptoms:['慢性的な便秘または下痢','お腹の張り・ガス','食物アレルギー・不耐症','肌トラブル全般','気分が食事に連動'],
    cascade:'腸内環境の悪化がすべての起点。免疫系の70%が腸に集中。',
    detox:'腸のリセットが最優先かつ最重要。ファスティングで腸壁を修復。' },
  { sun:'earth', moon:'water', name:'消化依存 → 水毒蓄積タイプ', subtitle:'腸を酷使 × ストレスで腎臓が停滞',
    riskLiver:15, riskGut:75, riskKidney:70, riskCirc:15,
    desc:'消化に負担がかかりやすく、精神的に沈むと水分代謝まで滞る。',
    symptoms:['身体全体の重だるさ','むくみ＋便秘の同時発生','低気圧での体調悪化','感情の鈍化・無気力感','下半身太り'],
    cascade:'腸からの水分吸収異常→腎臓への過負荷→全身の水分バランス崩壊。',
    detox:'腸と腎臓を同時にケア。温性のハーブで水の巡りを起こしながら腸内環境を再建。' },
  { sun:'earth', moon:'wind', name:'消化依存 → 巡り停滞タイプ', subtitle:'腸を酷使 × ストレスで循環・神経が乱れる',
    riskLiver:15, riskGut:75, riskKidney:15, riskCirc:60,
    desc:'胃腸の負担がベースにあり、ストレスが加わると頭と身体の連携が乱れる。',
    symptoms:['ストレス性の食欲異常','頭痛と腹痛の同時発生','肩こり慢性化','不安感・焦燥感','手汗・脇汗'],
    cascade:'腸-脳相関の乱れが核心。セロトニン産生低下→自律神経バランス崩壊。',
    detox:'腸内環境の立て直しが最優先。腸が整えば神経系も自然と回復。' },

  // ─── SUN: WATER ───────────────────────────────
  { sun:'water', moon:'fire', name:'濾過過負荷 → 肝臓炎上タイプ', subtitle:'腎臓酷使 × ストレスで肝臓が燃え上がる',
    riskLiver:70, riskGut:15, riskKidney:75, riskCirc:20,
    desc:'水分代謝や感情処理に腎臓を常に使い、追い込まれると肝臓に火がつく。',
    symptoms:['普段は穏やかだが突然の激怒','むくみ→急な発熱・炎症','腰痛と肝臓エリアの同時不調','アルコールでの暴走','感情の抑圧→爆発サイクル'],
    cascade:'腎臓で処理しきれない老廃物が肝臓に回り、両臓器が同時に疲弊。',
    detox:'腎臓の負担軽減が先決。水分代謝を正常化してから肝臓ケアに移行。' },
  { sun:'water', moon:'earth', name:'濾過過負荷 → 消化崩壊タイプ', subtitle:'腎臓酷使 × ストレスで腸に波及',
    riskLiver:10, riskGut:70, riskKidney:75, riskCirc:10,
    desc:'感受性が高く腎臓に常に負荷がかかり、心が折れると胃腸に直撃する。',
    symptoms:['緊張・不安時の腹痛・下痢','むくみと消化不良のセット','食欲の極端な変動','低体温傾向','感情に引きずられる体調'],
    cascade:'腎臓の水分調整機能低下→腸の水分バランス崩壊。',
    detox:'腎臓と腸の水分バランスを同時に整える。温かいハーブティーでの緩やかなデトックス。' },
  { sun:'water', moon:'water', name:'濾過系集中負荷タイプ', subtitle:'腎臓フル稼働 × ストレスでも腎臓に集中',
    riskLiver:10, riskGut:10, riskKidney:95, riskCirc:15,
    desc:'水分代謝と感情処理がすべて腎臓に集中する体質。',
    symptoms:['慢性的なむくみ','冷え性・低体温','感情の波が激しい','頻尿または尿量減少','恐怖心・不安感が強い'],
    cascade:'腎臓の濾過機能低下→冷え→代謝低下→さらに腎臓に負担の悪循環。',
    detox:'腎臓を最優先で温め、水の巡りを回復させることがすべての起点。' },
  { sun:'water', moon:'wind', name:'濾過過負荷 → 神経漂流タイプ', subtitle:'腎臓酷使 × ストレスで循環・神経が浮遊',
    riskLiver:10, riskGut:10, riskKidney:75, riskCirc:65,
    desc:'感受性の鋭さで腎臓を消耗し、限界を超えると思考と神経がフリーズする。',
    symptoms:['フリーズ反応（思考停止）','めまい・ふらつき','むくみ＋手足のしびれ','過敏性（音・光・匂い）','離人感・現実感の喪失'],
    cascade:'腎臓の機能低下で電解質バランスが崩れ、神経伝達に直接影響。',
    detox:'腎臓ケアで水分バランスを安定させつつ、神経系を鎮静するハーブを併用。' },

  // ─── SUN: WIND ────────────────────────────────
  { sun:'wind', moon:'fire', name:'循環過敏 → 肝臓炎上タイプ', subtitle:'循環・神経を酷使 × ストレスで肝臓に火がつく',
    riskLiver:70, riskGut:10, riskKidney:15, riskCirc:75,
    desc:'頭の回転が速く神経をフル稼働させるが、限界を超えると肝臓に噴出。',
    symptoms:['思考の暴走・止まらない頭','突発的な怒りやイライラ','偏頭痛','不眠→翌日の肝臓疲労','カフェイン依存'],
    cascade:'自律神経の過緊張→交感神経優位固定→肝臓への血流パターン異常。',
    detox:'まず神経系を鎮めることが先決。その上で肝臓のデトックス。' },
  { sun:'wind', moon:'earth', name:'循環過敏 → 消化停滞タイプ', subtitle:'循環・神経を酷使 × ストレスで腸が止まる',
    riskLiver:10, riskGut:70, riskKidney:10, riskCirc:75,
    desc:'常に頭を使い神経が張り詰め、ストレスの出口が腸に向かう。',
    symptoms:['ストレス性の便秘','食欲不振・胃の締めつけ','蠕動運動低下','顎関節の緊張・歯ぎしり','過敏性腸症候群的な症状'],
    cascade:'自律神経の乱れが腸の蠕動運動を直接抑制。腸-脳相関が最も強く出るタイプ。',
    detox:'神経系のリラクゼーションが腸の回復の前提条件。呼吸法とハーブの組み合わせ。' },
  { sun:'wind', moon:'water', name:'循環過敏 → 腎臓沈降タイプ', subtitle:'循環・神経を酷使 × ストレスで腎臓が沈む',
    riskLiver:10, riskGut:10, riskKidney:65, riskCirc:75,
    desc:'知的活動で神経を使い果たし、限界を超えると身体が「沈む」。燃え尽き型の体質。',
    symptoms:['燃え尽き後の強いむくみ','思考クリアだが身体が動かない','下半身の冷え・重さ','朝起きられない','涙もろくなる'],
    cascade:'神経系の過負荷→副腎疲労→腎臓機能低下。',
    detox:'神経を鎮めつつ腎臓を温める。アダプトゲン系ハーブとの組み合わせで副腎もサポート。' },
  { sun:'wind', moon:'wind', name:'循環・神経系集中負荷タイプ', subtitle:'循環・神経フル稼働 × ストレスでも神経に集中',
    riskLiver:10, riskGut:10, riskKidney:15, riskCirc:95,
    desc:'「巡り」のすべてが課題。血流・神経伝達・思考の流れ、すべてが両極端になりやすい。',
    symptoms:['慢性的な肩こり・首こり','不眠・浅い睡眠','手足の冷え＋頭ののぼせ','動悸・不整脈感','思考の空転・決断できない'],
    cascade:'自律神経の調整不全が血管の収縮・拡張を不安定化。',
    detox:'循環と神経を同時に整えるアプローチ。温冷交代浴的な刺激と鎮静ハーブ。呼吸法が最も効くタイプ。' },
];

/**
 * 40-Question Assessment Categories:
 *   Q1-10:  gut (腸・消化器系)
 *   Q11-20: liver (肝臓・解毒系)
 *   Q21-30: kidney (腎臓・水分代謝系)
 *   Q31-40: circ (循環・神経系)
 * 
 * Trap questions for moon-sign validation:
 *   Q6:  moon_earth_wind
 *   Q9:  moon_earth
 *   Q16: moon_fire
 *   Q25: moon_water
 *   Q26: moon_water
 *   Q29: moon_water_fire
 *   Q35: moon_wind
 *   Q38: moon_wind_water
 * 
 * Questions are RANDOMIZED before display to prevent users from 
 * predicting organ-specific patterns.
 * 
 * TERMINOLOGY COMPLIANCE:
 * - 「診断」 is replaced with 「解析」「分析」「プロファイリング」 in all user-facing content.
 * - 「読み解く」 is replaced with 「可視化する」「クロス解析する」.
 * - Organic emojis (🌿🍃💧❤️🔥) are replaced with scientific icons (🧬🧪🔬🩸).
 *
 * NOTE: Element names should be replaced with numeric codes 
 * (fire=1, earth=2, water=3, wind=4) when shared with engineers.
 */

export { ELEMENTS, ZODIAC_GROUPS, TYPES };
