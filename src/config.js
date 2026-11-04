// config.js — BẢN CHO LỚP NHÁP c1-p82 (đè src/config.js khi chạy server lớp _wip/c1-p82/_gen/serve.sh). src/config.js sống KHÔNG đổi.
export const CONFIG = {
  // (cũ) Discord — đã bỏ theo anh chốt 2026-11-03, để rỗng.
  DISCORD_CLIENT_ID: '',
  DISCORD_REDIRECT: '',
  // Public URL of the game (used for share links). Empty = current location.
  SITE_URL: '',
  // plan-82 Bậc 0 — Supabase (đăng nhập Google + email nhận mã, save mây). ANH TỰ DÁN trên máy:
  //   Supabase → Project Settings → API (hoặc API Keys): Project URL + khoá "anon" / "publishable" (KHÔNG dán khoá service_role / secret).
  //   Rỗng → mọi tính năng mạng tắt. Chỉ có tác dụng khi mở game với ?cloud82=1 (không kèm cloud=mock).
  SUPABASE_URL: 'https://mqzjfzrchblbgmvzfece.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_v5r4stKXpAvrOrc_162P8A_CQwk51sQ',
  CLOUD_ON: true
};
