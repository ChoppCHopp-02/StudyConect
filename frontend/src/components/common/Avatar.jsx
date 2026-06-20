// src/components/common/Avatar.jsx
// Reusable avatar component — hiển thị ảnh hoặc initial letter

import { AVATAR_COLORS } from '../../constants';

/**
 * Avatar component
 * @param {string}  src     - URL ảnh (nếu có)
 * @param {string}  initial - Chữ cái đầu (fallback khi không có ảnh)
 * @param {string}  color   - Màu nền tuỳ chỉnh (optional)
 * @param {number}  size    - Kích thước pixel (default: 40)
 * @param {string}  alt     - Alt text cho img
 */
export default function Avatar({ src, initial = 'U', color, size = 40, alt = '' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }

  // extract display letter (first letter in uppercase)
  const displayLetter = String(initial || 'U')[0].toUpperCase();

  // calculate hash from the entire initial string to give unique colors to different names starting with the same letter
  let hash = 0;
  const str = String(initial || 'U');
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const bg =
    color ||
    AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];

  const isGradient = String(bg).includes('gradient');
  const backgroundStyle = isGradient ? bg : `linear-gradient(135deg, ${bg}, ${bg}99)`;
  const hexMatch = String(bg).match(/#[a-fA-F0-9]{3,8}/);
  const shadowColor = hexMatch ? hexMatch[0] : (isGradient ? 'rgba(0,0,0,0.15)' : bg);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: backgroundStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 800,
        color: '#fff',
        boxShadow: `0 0 0 2px ${shadowColor}44`,
        userSelect: 'none',
      }}
    >
      {displayLetter}
    </div>
  );
}
