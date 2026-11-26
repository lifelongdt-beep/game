#!/usr/bin/env python3
"""지역 브리핑 지도용 동 경계 파일 만들기(한 번 돌려 결과를 저장소에 둔다).

오픈스트리트맵 주소 검색(Nominatim)은 법정동 경계를 주지 못하는 동이 많아(점만 오거나 못 찾음) 지도에 빠진 동이 생겼다.
그래서 행정동 경계(vuski/admdongkor, 통계청 통계지리정보서비스 경계를 바탕으로 정리한 공개 자료, 2026-10-01 시점)를
시군구별로 잘라 docs/regions/geo/<시군구 코드>.json으로 둔다. 화면은 이 경계를 칠하고, 법정동 기록(실거래)과는
이름으로 잇는다(예: 법정동 오류동·왕길동 → 행정동 오류왕길동). 이름으로 못 잇는 행정동은 화면에서 위치로 잇는다.

  pip install pyarrow shapely pyproj
  curl -o emd.parquet https://raw.githubusercontent.com/vuski/admdongkor/master/parquet/emd_20261001.parquet
  python3 scripts/build-dong-geo.py emd.parquet

결과 형식: {"v": "20261001", "f": [{"n": 행정동 이름, "c": 행정기관코드, "b": [이어진 법정동], "g": GeoJSON geometry}]}
"""
import json, os, re, sys
import pyarrow.parquet as pq
import shapely
from pyproj import Transformer

VERSION = '20261001'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'regions', 'geo')
TOL_M = 15  # 단순화 허용 오차(미터)

# 2026년 행정구역 개편으로 실거래 코드(regions-kr.json)와 경계 자료의 시군구 코드가 다른 곳. 이름으로 못 잇는 것만 적는다.
# 인천 중구 → 영종구 전부 + 제물포구 중 동구 법정동 이름과 이어지지 않는 행정동, 인천 동구 → 제물포구 중 동구 법정동과 이어지는 행정동.
SPLIT = {'28110': ['28125', '28155'], '28140': ['28125']}
SIDO_ALIAS = {'광주': '전남광주통합특별시', '전남': '전남광주통합특별시'}


def base(name):
    """법정동·행정동 이름의 뼈대: 끝의 숫자·동/가/읍/면/리를 뗀다(신문로1가 → 신문로, 역삼2동 → 역삼)."""
    return re.sub(r'(제?[0-9.·,]+)?(동|가|읍|면|리|로)$', '', name)


def main(src):
    rows = pq.read_table(src).to_pylist()
    to4326 = Transformer.from_crs(5179, 4326, always_xy=True).transform
    by_sgg = {}
    for r in rows:
        by_sgg.setdefault(r['sggcd'], []).append(r)
    regions = json.load(open(os.path.join(ROOT, 'scripts', 'regions-kr.json'), encoding='utf8'))['regions']
    os.makedirs(OUT, exist_ok=True)
    report = []
    for reg in regions:
        codes = SPLIT.get(reg['code'])
        if not codes:
            codes = [reg['code']] if reg['code'] in by_sgg else []
        if not codes:  # 코드가 바뀐 곳: 같은 시·도(또는 통합 시·도)에서 이름으로 찾는다(화성시 → 화성시○○구 넷).
            sido = SIDO_ALIAS.get(reg['sido'], reg['sido'])
            name = reg['name'].replace(' ', '')
            codes = [k for k, v in by_sgg.items()
                     if v[0]['sidonm'].startswith(sido[:2]) and (v[0]['sggnm'].replace(' ', '') == name or v[0]['sggnm'].replace(' ', '').startswith(name))]
        feats = [r for k in codes for r in by_sgg.get(k, [])]
        dongs = reg.get('dongs') or []
        bj = {d: base(d) for d in dongs}
        out = []
        for r in feats:
            hb = base(r['emdnm'])
            linked = [d for d, b in bj.items() if b and (b == hb or (len(b) >= 2 and b in hb))]
            if r['sggcd'] == '28125':
                donggu = next(x for x in regions if x['code'] == '28140')
                in_donggu = any(base(d) and (base(d) == hb or (len(base(d)) >= 2 and base(d) in hb)) for d in donggu['dongs'])
                if (reg['code'] == '28140') != in_donggu:
                    continue
            g = shapely.from_wkb(r.get('geom') or r.get('geometry'))
            g = shapely.transform(g.simplify(TOL_M, preserve_topology=True), lambda xy: __import__('numpy').column_stack(to4326(xy[:, 0], xy[:, 1])))
            gj = json.loads(json.dumps(shapely.geometry.mapping(g)), parse_float=lambda x: round(float(x), 5))
            out.append({'n': r['emdnm'], 'c': r['emdcd'], 'b': linked, 'g': gj})
        with open(os.path.join(OUT, reg['code'] + '.json'), 'w', encoding='utf8') as f:
            json.dump({'v': VERSION, 'f': out}, f, ensure_ascii=False, separators=(',', ':'))
        linked_all = {d for o in out for d in o['b']}
        report.append((reg['code'], reg['sido'], reg['name'], len(out), len(linked_all), len(dongs)))
    empty = [r for r in report if r[3] == 0]
    print(f'시군구 {len(report)}곳, 경계 없는 곳 {len(empty)}: {empty}')
    return report


if __name__ == '__main__':
    main(sys.argv[1])
