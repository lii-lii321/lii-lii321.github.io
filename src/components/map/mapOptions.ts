/**
 * 足迹地图的 ECharts 配置构建（纯函数，无副作用，可在 node 中复用与验证）。
 *
 * 颜色与 src/styles/global.css 的浅色设计令牌保持一致：
 * 纸白底（paper/paper-3）+ 靛蓝强调（accent）+ 墨色文字（ink/ink-2）。
 */
import type { EChartsOption } from 'echarts';
import type { Trip } from '../../types';

export type MapView = 'world' | 'china';

/** 设计令牌（与 @theme 变量一一对应，ECharts 无法读 CSS 变量，故在此镜像一份） */
export const TOKENS = {
  paper: '#fbfaf7',
  paper2: '#f3f1ea',
  paper3: '#e9e6dc',
  ink: '#15151a',
  ink2: '#4b4b55',
  ink3: '#8c8c96',
  accent: '#2f4bff',
  rule2: '#cfcbbd',
} as const;

/** 未点亮区域的填充色（浅纸色陆地） */
const AREA_IDLE = '#e9e6dc';
/** 悬停时区域填充色 */
const AREA_EMPHASIS = '#ddd9c9';

/**
 * 世界地图英文名 → 中文名映射。
 * 键与 src/assets/geo/world.json 的 feature.properties.name 完全对应
 * （echarts 官方 world.json，含 217 个 feature，其中 2 个无名称，已省略）。
 * 通过 geo.nameMap 应用后，ECharts 内部对区域的一切引用都使用中文值。
 */
export const WORLD_NAME_MAP: Record<string, string> = {
  Somalia: '索马里',
  Liechtenstein: '列支敦士登',
  Morocco: '摩洛哥',
  'W. Sahara': '西撒哈拉',
  Serbia: '塞尔维亚',
  Afghanistan: '阿富汗',
  Angola: '安哥拉',
  Albania: '阿尔巴尼亚',
  Aland: '奥兰群岛',
  Andorra: '安道尔',
  'United Arab Emirates': '阿联酋',
  Argentina: '阿根廷',
  Armenia: '亚美尼亚',
  'American Samoa': '美属萨摩亚',
  'Fr. S. Antarctic Lands': '法属南部领地',
  'Antigua and Barb.': '安提瓜和巴布达',
  Australia: '澳大利亚',
  Austria: '奥地利',
  Azerbaijan: '阿塞拜疆',
  Burundi: '布隆迪',
  Belgium: '比利时',
  Benin: '贝宁',
  'Burkina Faso': '布基纳法索',
  Bangladesh: '孟加拉国',
  Bulgaria: '保加利亚',
  Bahrain: '巴林',
  Bahamas: '巴哈马',
  'Bosnia and Herz.': '波黑',
  Belarus: '白俄罗斯',
  Belize: '伯利兹',
  Bermuda: '百慕大',
  Bolivia: '玻利维亚',
  Brazil: '巴西',
  Barbados: '巴巴多斯',
  Brunei: '文莱',
  Bhutan: '不丹',
  Botswana: '博茨瓦纳',
  'Central African Rep.': '中非',
  Canada: '加拿大',
  Switzerland: '瑞士',
  Chile: '智利',
  China: '中国',
  "Côte d'Ivoire": '科特迪瓦',
  Cameroon: '喀麦隆',
  'Dem. Rep. Congo': '刚果（金）',
  Congo: '刚果（布）',
  Colombia: '哥伦比亚',
  Comoros: '科摩罗',
  'Cape Verde': '佛得角',
  'Costa Rica': '哥斯达黎加',
  Cuba: '古巴',
  'Curaçao': '库拉索',
  'Cayman Is.': '开曼群岛',
  'N. Cyprus': '北塞浦路斯',
  Cyprus: '塞浦路斯',
  'Czech Rep.': '捷克',
  Germany: '德国',
  Djibouti: '吉布提',
  Dominica: '多米尼克',
  Denmark: '丹麦',
  'Dominican Rep.': '多米尼加',
  Algeria: '阿尔及利亚',
  Ecuador: '厄瓜多尔',
  Egypt: '埃及',
  Eritrea: '厄立特里亚',
  Spain: '西班牙',
  Estonia: '爱沙尼亚',
  Ethiopia: '埃塞俄比亚',
  Finland: '芬兰',
  Fiji: '斐济',
  'Falkland Is.': '福克兰群岛',
  France: '法国',
  'Faeroe Is.': '法罗群岛',
  Micronesia: '密克罗尼西亚',
  Gabon: '加蓬',
  'United Kingdom': '英国',
  Georgia: '格鲁吉亚',
  Ghana: '加纳',
  Guinea: '几内亚',
  Gambia: '冈比亚',
  'Guinea-Bissau': '几内亚比绍',
  'Eq. Guinea': '赤道几内亚',
  Greece: '希腊',
  Grenada: '格林纳达',
  Greenland: '格陵兰',
  Guatemala: '危地马拉',
  Guam: '关岛',
  Guyana: '圭亚那',
  'Heard I. and McDonald Is.': '赫德岛',
  Honduras: '洪都拉斯',
  Croatia: '克罗地亚',
  Haiti: '海地',
  Hungary: '匈牙利',
  Indonesia: '印度尼西亚',
  'Isle of Man': '马恩岛',
  India: '印度',
  'Br. Indian Ocean Ter.': '英属印度洋领地',
  Ireland: '爱尔兰',
  Iran: '伊朗',
  Iraq: '伊拉克',
  Iceland: '冰岛',
  Israel: '以色列',
  Italy: '意大利',
  Jamaica: '牙买加',
  Jersey: '泽西岛',
  Jordan: '约旦',
  Japan: '日本',
  'Siachen Glacier': '锡亚琴冰川',
  Kazakhstan: '哈萨克斯坦',
  Kenya: '肯尼亚',
  Kyrgyzstan: '吉尔吉斯斯坦',
  Cambodia: '柬埔寨',
  Kiribati: '基里巴斯',
  Korea: '韩国',
  Kuwait: '科威特',
  'Lao PDR': '老挝',
  Lebanon: '黎巴嫩',
  Liberia: '利比里亚',
  Libya: '利比亚',
  'Saint Lucia': '圣卢西亚',
  'Sri Lanka': '斯里兰卡',
  Lesotho: '莱索托',
  Lithuania: '立陶宛',
  Luxembourg: '卢森堡',
  Latvia: '拉脱维亚',
  Moldova: '摩尔多瓦',
  Madagascar: '马达加斯加',
  Mexico: '墨西哥',
  Macedonia: '北马其顿',
  Mali: '马里',
  Malta: '马耳他',
  Myanmar: '缅甸',
  Montenegro: '黑山',
  Mongolia: '蒙古',
  'N. Mariana Is.': '北马里亚纳群岛',
  Mozambique: '莫桑比克',
  Mauritania: '毛里塔尼亚',
  Montserrat: '蒙特塞拉特',
  Mauritius: '毛里求斯',
  Malawi: '马拉维',
  Malaysia: '马来西亚',
  Namibia: '纳米比亚',
  'New Caledonia': '新喀里多尼亚',
  Niger: '尼日尔',
  Nigeria: '尼日利亚',
  Nicaragua: '尼加拉瓜',
  Niue: '纽埃',
  Netherlands: '荷兰',
  Norway: '挪威',
  Nepal: '尼泊尔',
  'New Zealand': '新西兰',
  Oman: '阿曼',
  Pakistan: '巴基斯坦',
  Panama: '巴拿马',
  Peru: '秘鲁',
  Philippines: '菲律宾',
  Palau: '帕劳',
  'Papua New Guinea': '巴布亚新几内亚',
  Poland: '波兰',
  'Puerto Rico': '波多黎各',
  'Dem. Rep. Korea': '朝鲜',
  Portugal: '葡萄牙',
  Paraguay: '巴拉圭',
  Palestine: '巴勒斯坦',
  'Fr. Polynesia': '法属波利尼西亚',
  Qatar: '卡塔尔',
  Romania: '罗马尼亚',
  Russia: '俄罗斯',
  Rwanda: '卢旺达',
  'Saudi Arabia': '沙特阿拉伯',
  Sudan: '苏丹',
  'S. Sudan': '南苏丹',
  Senegal: '塞内加尔',
  Singapore: '新加坡',
  'S. Geo. and S. Sandw. Is.': '南乔治亚岛',
  'Saint Helena': '圣赫勒拿',
  'Solomon Is.': '所罗门群岛',
  'Sierra Leone': '塞拉利昂',
  'El Salvador': '萨尔瓦多',
  'St. Pierre and Miquelon': '圣皮埃尔和密克隆',
  'São Tomé and Principe': '圣多美和普林西比',
  Suriname: '苏里南',
  Slovakia: '斯洛伐克',
  Slovenia: '斯洛文尼亚',
  Sweden: '瑞典',
  Swaziland: '斯威士兰',
  Seychelles: '塞舌尔',
  Syria: '叙利亚',
  'Turks and Caicos Is.': '特克斯和凯科斯群岛',
  Chad: '乍得',
  Togo: '多哥',
  Thailand: '泰国',
  Tajikistan: '塔吉克斯坦',
  Turkmenistan: '土库曼斯坦',
  'Timor-Leste': '东帝汶',
  Tonga: '汤加',
  'Trinidad and Tobago': '特立尼达和多巴哥',
  Tunisia: '突尼斯',
  Turkey: '土耳其',
  Tanzania: '坦桑尼亚',
  Uganda: '乌干达',
  Ukraine: '乌克兰',
  Uruguay: '乌拉圭',
  'United States': '美国',
  Uzbekistan: '乌兹别克斯坦',
  'St. Vin. and Gren.': '圣文森特和格林纳丁斯',
  Venezuela: '委内瑞拉',
  'U.S. Virgin Is.': '美属维尔京群岛',
  Vietnam: '越南',
  Vanuatu: '瓦努阿图',
  Samoa: '萨摩亚',
  Yemen: '也门',
  'South Africa': '南非',
  Zambia: '赞比亚',
  Zimbabwe: '津巴布韦',
};

/**
 * 省级行政区全称 → 简称（云南省→云南、内蒙古自治区→内蒙古、
 * 新疆维吾尔自治区→新疆、香港特别行政区→香港……）。
 * 用于把 DataV china.json 的全称与 visited.json 里的简称互相匹配。
 */
export function normalizeProvinceName(name: string): string {
  return name
    .replace(/(省|市|特别行政区|自治区)$/, '')
    .replace(/(维吾尔|回族|壮族)$/, '');
}

/** #rrggbb → rgba(...) */
function hexToRgba(hex: string, alpha: number): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 同一地点（国家 + 地点名相同）的多条旅行聚合为一个标记 */
export interface PlaceCluster {
  /** 面板选中态使用的键：`${country}::${name}` */
  key: string;
  /** 地点名，如 "大理古城" */
  name: string;
  country: string;
  province: string | null;
  lng: number;
  lat: number;
  /** 该地点的全部旅行（按日期倒序） */
  trips: Trip[];
  /** 该地点照片总数 */
  photoCount: number;
}

export function clusterTripsByPlace(trips: Trip[]): PlaceCluster[] {
  const map = new Map<string, PlaceCluster & { _photos: number }>();
  for (const trip of trips) {
    const key = `${trip.place.country}::${trip.place.name}`;
    let cluster = map.get(key);
    if (!cluster) {
      cluster = {
        key,
        name: trip.place.name,
        country: trip.place.country,
        province: trip.place.province,
        lng: trip.place.lng,
        lat: trip.place.lat,
        trips: [],
        photoCount: 0,
        _photos: 0,
      };
      map.set(key, cluster);
    }
    cluster.trips.push(trip);
    cluster._photos += trip.photos.length;
  }
  const clusters = [...map.values()].map(({ _photos, ...c }) => ({
    ...c,
    photoCount: _photos,
    trips: [...c.trips].sort((a, b) => b.date.localeCompare(a.date)),
  }));
  // 照片多的地点排在前面（散点渲染顺序更合理）
  return clusters.sort((a, b) => b.photoCount - a.photoCount);
}

/** 标记大小随照片数增长（平方根缓增，限制在 9–34px） */
export function markerSymbolSize(photoCount: number): number {
  return Math.min(34, 9 + Math.sqrt(Math.max(photoCount, 1)) * 2.6);
}

/**
 * 由 geojson 的 feature 名称集合解析「点亮名单」。
 * 返回能实际匹配上的 region 名（world 视图为中文名，china 视图为省份简称）；
 * 匹配不上的名单项会被跳过而不是报错。
 */
export function resolveHighlighted(
  view: MapView,
  featureNames: string[],
  visitedCountries: string[],
  visitedProvinces: string[],
): string[] {
  if (view === 'world') {
    const cnNames = new Set(Object.values(WORLD_NAME_MAP));
    return visitedCountries.filter((c) => cnNames.has(c));
  }
  const shortNames = new Set(featureNames.map(normalizeProvinceName));
  return visitedProvinces.filter((p) => shortNames.has(p));
}

/** geo.nameMap：world 视图为英→中字典；china 视图为全称→简称（由 feature 名称推导） */
export function buildNameMap(view: MapView, featureNames: string[]): Record<string, string> {
  if (view === 'world') return WORLD_NAME_MAP;
  const map: Record<string, string> = {};
  for (const name of featureNames) {
    if (name) map[name] = normalizeProvinceName(name);
  }
  return map;
}

export interface MapOptionParams {
  view: MapView;
  clusters: PlaceCluster[];
  /** 已解析、确认存在于当前地图中的点亮名单 */
  highlighted: string[];
  nameMap: Record<string, string>;
}

/** 构建某一视图的完整 ECharts option */
export function buildMapOption(params: MapOptionParams): EChartsOption {
  const { view, clusters, highlighted, nameMap } = params;
  // 世界 / 中国两个视图统一用靛蓝点亮，和浅色页面的强调色一致
  const highlightColor = TOKENS.accent;

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(251,250,247,0.97)',
      borderColor: hexToRgba(highlightColor, 0.35),
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: TOKENS.ink2, fontSize: 12 },
      formatter: (p: unknown) => {
        const d = (p as { seriesType?: string; data?: Record<string, unknown> }) ?? {};
        if (d.seriesType !== 'effectScatter' || !d.data) return '';
        const data = d.data as {
          placeName: string;
          region: string;
          tripCount: number;
          photoCount: number;
        };
        return [
          `<b style="font-size:13px;color:${highlightColor}">${data.placeName}</b>`,
          `<span style="opacity:.55">${data.region}</span>`,
          `${data.tripCount} 次旅行 · ${data.photoCount} 张照片`,
          '<span style="opacity:.5">点击查看 →</span>',
        ].join('<br/>');
      },
    },
    geo: {
      map: view,
      roam: true,
      zoom: view === 'world' ? 1 : 1.05,
      scaleLimit: { min: 0.6, max: 12 },
      nameMap,
      label: { show: false },
      itemStyle: {
        areaColor: AREA_IDLE,
        borderColor: 'rgba(207,203,189,0.9)',
        borderWidth: 0.6,
      },
      emphasis: {
        label: { show: true, color: TOKENS.ink, fontSize: 11, fontWeight: 500 },
        itemStyle: { areaColor: AREA_EMPHASIS },
      },
      regions: highlighted.map((name) => ({
        name,
        itemStyle: {
          areaColor: hexToRgba(highlightColor, 0.16),
          borderColor: hexToRgba(highlightColor, 0.6),
          borderWidth: 0.9,
        },
        emphasis: {
          itemStyle: { areaColor: hexToRgba(highlightColor, 0.3) },
          label: { color: highlightColor, fontWeight: 600 },
        },
      })),
    },
    series: [
      {
        name: 'travel-places',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        rippleEffect: { brushType: 'stroke', scale: 2.8, period: 4.5 },
        symbolSize: (_value: unknown, p: { data?: { photoCount?: number } }) =>
          markerSymbolSize(p?.data?.photoCount ?? 1),
        itemStyle: {
          color: TOKENS.accent,
          shadowBlur: 10,
          shadowColor: 'rgba(47,75,255,0.5)',
        },
        label: {
          show: true,
          position: 'top',
          distance: 7,
          formatter: (p: { data?: { placeName?: string } }) => p?.data?.placeName ?? '',
          color: TOKENS.ink2,
          fontSize: 11,
          textBorderColor: 'rgba(251,250,247,0.95)',
          textBorderWidth: 2,
        },
        data: clusters.map((c) => ({
          name: c.name,
          value: [c.lng, c.lat] as [number, number],
          placeKey: c.key,
          placeName: c.name,
          region: c.province ? `${c.country} · ${c.province}` : c.country,
          tripCount: c.trips.length,
          photoCount: c.photoCount,
        })) as never,
      },
    ],
  } as EChartsOption;
}
