// 2026-11-02：酒店详情页的房价在房型表 .hprt-table（prco-valign-middle-helper）里；data-testid=price-and-discounted-price 主要出现在搜索结果卡片。
// 房型表按房型排列、不按价格排序，读到的是第一个可见房型的价格。
// Booking DOM 易变，需定期维护；只读取当前可见元素，价格可能为每晚或整段住宿。
// Agoda TODO：占位选择器，尚未完成真实页面适配。
globalThis.HotelSelectors = location.hostname.endsWith('booking.com') ? {
  name:['[data-testid="title"]','h2.pp-header__title','h1'],
  price:['.hprt-table .prco-valign-middle-helper','.hprt-price-block .bui-price-display__value','[data-testid="price-and-discounted-price"]','[data-testid="price-and-discounted-price"] span','.bui-price-display__value'],
  checkin:['[data-testid="date-display-field-start"]'],checkout:['[data-testid="date-display-field-end"]']
} : {name:['h1'],price:['[data-selenium="display-price"]'],checkin:[],checkout:[]};
