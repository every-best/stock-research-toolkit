/**
 * Test HK stock fetching
 */
import axios from "axios";

const url = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?_var=kline_dayqfq&param=hk00700,day,,,5,qfq&r=0.1';

const res = await axios.get(url, {
  headers: {
    'Referer': 'https://gu.qq.com/',
    'User-Agent': 'Mozilla/5.0'
  }
});

const text = res.data;
const jsonStr = text.replace(/^[^=]+=/, '');
const json = JSON.parse(jsonStr);

const dayData = json.data.hk00700.day;
console.log('Day data type:', typeof dayData);
console.log('Is array:', Array.isArray(dayData));
console.log('Length:', dayData.length);

for (const item of dayData) {
  console.log('Item:', JSON.stringify(item));
  console.log('date:', item[0]);
  console.log('open:', item[1], 'close:', item[2], 'high:', item[3], 'low:', item[4]);
  break;
}
