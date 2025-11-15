# Cloudinary 설정 안내

## 1. Cloudinary 계정 생성
1. https://cloudinary.com 접속
2. 무료 계정 생성 (월 25GB 무료)
3. 대시보드에서 Cloud Name 확인

## 2. Upload Preset 설정
1. Cloudinary 대시보드에서 "Settings" → "Upload" 클릭
2. "Add upload preset" 클릭
3. Preset name: `book-covers` (또는 원하는 이름)
4. Signing Mode: `Unsigned` 선택 (개발용)
5. Folder: `book-covers` 설정
6. "Save" 클릭

## 3. 코드에서 설정 변경
`src/components/CloudinaryUploadWidget.tsx` 파일에서 다음 부분을 수정:

```typescript
cloudName: 'your-cloud-name', // 실제 Cloudinary 클라우드 이름으로 변경
uploadPreset: 'your-upload-preset', // 실제 업로드 프리셋으로 변경
```

## 4. 보안 설정 (선택사항)
프로덕션 환경에서는:
1. Signing Mode를 `Signed`로 변경
2. 서버에서 서명을 생성하여 클라이언트에 전달
3. 또는 서버 사이드에서 직접 업로드 처리

## 5. 테스트
1. 개발 서버 실행
2. 도서 추가 모달에서 "이미지 선택" 버튼 클릭
3. Cloudinary 위젯이 열리는지 확인
4. 이미지 업로드 후 미리보기 확인

## 장점
- Firebase Storage CORS 문제 해결
- 더 나은 이미지 최적화
- 자동 리사이징 및 포맷 변환
- CDN을 통한 빠른 이미지 로딩
- 무료 플랜으로도 충분한 용량






















