# 최근 생성된 맵 목록 적용

로컬 LAYER:S의 USER MAP 화면에 최신순 목록, 맵 선택, REFRESH, LOAD MORE를 추가했습니다.
기존 맵 번호 또는 공유 링크 입력도 유지됩니다.

## Cloudflare 반영

1. Cloudflare에서 기존 `layers-server` Worker를 엽니다.
2. Edit code에서 Worker 코드를 `layers-map-worker.js` 전체 내용으로 교체합니다.
3. Deploy를 누릅니다.
4. 게임 화면을 강력 새로고침(Ctrl+Shift+R)하고 USER MAP을 엽니다.

기존 DB 바인딩, IP_HASH_SECRET, ALLOWED_ORIGIN 설정은 유지하세요.
이 파일은 기존 맵 업로드 및 조회 코드에 GET /api/maps 목록 조회만 추가한 전체 Worker입니다.
DB 테이블 변경은 필요 없습니다. 목록 조회 성능을 위해 선택적으로 기존 D1 데이터베이스의
콘솔에서 `maps-recent-index.sql`을 실행할 수 있습니다. 기존 데이터는 변경하지 않습니다.

주의: LAYER:S 프로젝트의 npm run deploy는 온라인 대전 Worker용입니다.
맵 서버 업데이트는 위의 기존 layers-server Worker에서 진행하세요.
이번 작업에서는 실제 Cloudflare 배포를 수행하지 않았습니다.

## API

GET /api/maps?limit=20
GET /api/maps?limit=20&cursor=CREATED_AT:ID

응답: { success: true, maps: [{ id, title, createdAt }], nextCursor }
createdAt은 기존 DB와 같은 Unix 초 단위이며, 생성 시각 내림차순, ID 내림차순으로 정렬합니다.
맵 본문, 업로드 토큰, IP 정보는 목록 응답에 포함하지 않습니다.
limit은 1~50이며 기본 20입니다. nextCursor가 null이면 마지막 페이지입니다.
