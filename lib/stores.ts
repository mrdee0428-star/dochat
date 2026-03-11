export interface StoreConfig {
  id: string;
  name: string;
  url: string;
  color: string;
}

export const STORES: StoreConfig[] = [
  { id: 'hoangha', name: 'Hoàng Hà Mobile', url: 'https://hoanghamobile.com/kho-san-pham-cu', color: '#e31837' },
  { id: 'cellphones', name: 'CellphoneS', url: 'https://cellphones.com.vn/hang-cu/dien-thoai.html', color: '#d70018' },
  { id: 'didongviet', name: 'Di Động Việt', url: 'https://didongviet.vn/iphone-cu.html', color: '#e22718' },
  { id: 'oneway', name: 'OneWay Mobile', url: 'https://onewaymobile.vn/iphone-99/', color: '#ff6600' },
  { id: 'clickbuy', name: 'ClickBuy', url: 'https://clickbuy.com.vn/dien-thoai-iphone-cu/', color: '#0066cc' },
  { id: 'techone', name: 'TechOne', url: 'https://www.techone.vn/iphone/', color: '#1a73e8' },
  { id: 'viettablet', name: 'VietTablet', url: 'https://www.viettablet.com/kho-may-cu/dien-thoai-iphone-cu/', color: '#0088cc' },
  { id: 'shopdunk', name: 'ShopDunk', url: 'https://shopdunk.com/may-cu', color: '#515154' },
  { id: 'taoden', name: 'Táo Đen Shop', url: 'https://www.taodenshop.com/iphonecu/', color: '#333333' },
  { id: 'mobilecity', name: 'MobileCity', url: 'https://mobilecity.vn/dien-thoai-apple/', color: '#ff0000' },
  { id: '24hstore', name: '24hStore', url: 'https://24hstore.vn/dien-thoai-iphone-cu/', color: '#f5a623' },
  { id: 'dienthoaivui', name: 'Điện Thoại Vui', url: 'https://dienthoaivui.com.vn/may-cu/dien-thoai-cu', color: '#e74c3c' },
  { id: 'duchuy', name: 'Đức Huy Mobile', url: 'https://www.duchuymobile.com/kho-may-cu', color: '#ff4444' },
];
