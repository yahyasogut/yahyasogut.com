/** @type {import('next').NextConfig} */
export default {
  output: "export",          // statik site: Vercel, Netlify, Cloudflare Pages veya herhangi bir hostingde çalışır
  trailingSlash: true,
  images: { unoptimized: true },
};
