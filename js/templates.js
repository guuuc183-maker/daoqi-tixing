// 分类模板（方案 ①）
export const CATEGORIES = {
  doc:   {name:'证件', icon:'🪪', days:[90,30,7], presets:['居留卡','护照','驾照','身份证','营业执照','租约']},
  car:   {name:'车辆', icon:'🚗', days:[30,7,1],  presets:['RCA 交强险','ITP 车检','Rovinieta 公路费','CASCO']},
  food:  {name:'保质期', icon:'🥫', days:[7,3,1], presets:['食材','药品','店内商品'], extra:true},
  other: {name:'其他', icon:'📌', days:[30,7,1],  presets:['订阅','保修','春节机票提醒']},
};
export const REMIND_OPTIONS=[90,60,30,14,7,3,1,0];
