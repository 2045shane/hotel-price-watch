// Booking DOM 易变，需定期维护；只读取当前可见元素，价格可能为每晚或整段住宿。
// Agoda TODO：占位选择器，尚未完成真实页面适配。
globalThis.HotelSelectors = location.hostname.endsWith('booking.com') ? {
  name:['[data-testid="title"]','h2.pp-header__title','h1'],
  price:['[data-testid="price-and-discounted-price"]','[data-testid="price-and-discounted-price"] span','.bui-price-display__value'],
  checkin:['[data-testid="date-display-field-start"]'],checkout:['[data-testid="date-display-field-end"]']
} : {name:['h1'],price:['[data-selenium="display-price"]'],checkin:[],checkout:[]};
