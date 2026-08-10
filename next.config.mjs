/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
};

export default nextConfig;
