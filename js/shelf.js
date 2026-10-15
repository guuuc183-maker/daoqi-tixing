// 默认保质期（i18n-校对/保质期核对.md，百科全书核对）。days = 预填到期日用的单一值：取区间下限（偏保守）。
// level：verified / partial / unverified（显示文字在语言包 shelfLevel.*）；说明在 shelf.<id>；src 为来源链接，只作为文字或外链显示，不加载任何外部资源。
const S1='https://ask.fsis.usda.gov/article/How-long-can-you-keep-dairy-products-like-yogurt-milk-and-cheese-in-the-refrigerator',
 S2='https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
 S3='https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/shelf-stable-food',
 S4='https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety',
 S5='https://www.gov.uk/guidance/egg-marketing-standards',S6='https://www.efsa.europa.eu/ro/safe2eat/food-date-labelling',
 S7='https://www.nutricia.co.uk/hcp/products/aptamil-pepti-1/',S8='https://www.anchordairy.com/us/en/nutrition-stories/faqs-and-product-facts/anchor-uht-milk-faqs.html',
 S9='https://www.cdc.gov/breastfeeding/breast-milk-preparation-and-storage/handling-breastmilk.html';
export const SHELF=[
 {id:'milk',days:7,level:'partial',src:[S1,S6]},
 {id:'uht',days:5,level:'partial',src:[S8,S3]},
 {id:'eggs',days:21,level:'verified',src:[S2,S5]},
 {id:'yogurt',days:7,level:'partial',src:[S1]},
 {id:'formula',days:28,level:'verified',src:[S7]},
 {id:'breastMilk',days:180,level:'verified',src:[S9]},
 {id:'mince',days:1,level:'verified',src:[S2]},
 {id:'meat',days:3,level:'verified',src:[S2]},
 {id:'fish',days:1,level:'verified',src:[S2]},
 {id:'shrimp',days:3,level:'verified',src:[S2]},
 {id:'canned',days:3,level:'verified',src:[S3]},
 {id:'sausage',days:14,level:'partial',src:[S2]},
 {id:'leftovers',days:3,level:'verified',src:[S4,S6]},
];
export const shelfFor=id=>SHELF.find(x=>x.id===id)||null;
