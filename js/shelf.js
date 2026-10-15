// 默认保质期（i18n-校对/保质期核对.md，百科全书核对）。days = 预填到期日用的单一值：取区间下限（偏保守）。
// level：已核实 / 部分 / 未核实；src 为来源链接，只作为文字或外链显示，不加载任何外部资源。
const S1='https://ask.fsis.usda.gov/article/How-long-can-you-keep-dairy-products-like-yogurt-milk-and-cheese-in-the-refrigerator',
 S2='https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
 S3='https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/shelf-stable-food',
 S4='https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety',
 S5='https://www.gov.uk/guidance/egg-marketing-standards',S6='https://www.efsa.europa.eu/ro/safe2eat/food-date-labelling',
 S7='https://www.nutricia.co.uk/hcp/products/aptamil-pepti-1/',S8='https://www.anchordairy.com/us/en/nutrition-stories/faqs-and-product-facts/anchor-uht-milk-faqs.html',
 S9='https://www.cdc.gov/breastfeeding/breast-milk-preparation-and-storage/handling-breastmilk.html';
export const SHELF=[
 {name:'牛奶',days:7,note:'鲜奶（巴氏）：未开封按包装 use by（经验值 5–7 天）；开封后冷藏 3–4 天',level:'部分',src:[S1,S6]},
 {name:'UHT 牛奶（开封后）',days:5,note:'常温奶未开封按包装；开封后冷藏 5–7 天',level:'部分',src:[S8,S3]},
 {name:'鸡蛋',days:21,note:'带壳生蛋冷藏 3–5 周；欧盟/英国 best before ≤ 产蛋后 28 天，最好按蛋盒日期',level:'已核实',src:[S2,S5]},
 {name:'酸奶',days:7,note:'未开封按包装（约 1–3 周）',level:'部分',src:[S1]},
 {name:'奶粉（开罐后）',days:28,note:'开罐后 4 周，以罐上说明为准；不要冷藏',level:'已核实',src:[S7]},
 {name:'母乳（冷冻）',days:180,note:'室温 ≤4 小时；冷藏 ≤4 天；冷冻约 6 个月最佳、最长 12 个月；解冻后 24 小时内用完',level:'已核实',src:[S9]},
 {name:'绞肉 / 禽肉（冷藏）',days:1,note:'冷藏 1–2 天；冷冻 3–12 个月',level:'已核实',src:[S2]},
 {name:'整块肉（冷藏）',days:3,note:'整块红肉冷藏 3–5 天；冷冻 3–12 个月',level:'已核实',src:[S2]},
 {name:'鱼（冷藏）',days:1,note:'鱼冷藏 1–3 天；冷冻 2–8 个月（视鱼种）',level:'已核实',src:[S2]},
 {name:'虾（冷藏）',days:3,note:'虾冷藏 3–5 天；冷冻 2–8 个月',level:'已核实',src:[S2]},
 {name:'罐头 / 午餐肉（开罐后）',days:3,note:'低酸罐头开罐后冷藏 3–4 天；高酸罐头（番茄、水果）未开 12–18 个月、开罐后 5–7 天',level:'已核实',src:[S3]},
 {name:'火腿肠（冷藏型）',days:14,note:'冷藏型未开封 2 周、开封后 1 周；常温型按包装',level:'部分',src:[S2]},
 {name:'剩菜',days:3,note:'冷藏 3–4 天（EFSA 建议 48 小时内）；冷冻 3–4 个月；常温超过 2 小时要扔',level:'已核实',src:[S4,S6]},
];
export const shelfFor=name=>SHELF.find(x=>x.name===name)||null;
