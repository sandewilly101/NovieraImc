const path = require('path');

const plannerRoot = path.resolve(__dirname, '../react-planner');
const appNodeModules = path.resolve(__dirname, 'node_modules');
const threeRoot = path.join(appNodeModules, 'three');

function pkgRoot(name) {
  return path.dirname(require.resolve(`${name}/package.json`));
}

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.plugins = (webpackConfig.resolve.plugins || []).filter(
        (p) => p.constructor?.name !== 'ModuleScopePlugin'
      );

      /*
       * Single copies of peer libs — react-planner (file: deps) can nest its own react / react-redux,
       * which breaks hooks: "Cannot read properties of null (reading 'useMemo')" inside connect().
       * Also alias subpath entry points (jsx-runtime, scheduler) so nothing resolves to a nested copy.
       */
      webpackConfig.resolve.alias = {
        ...(webpackConfig.resolve.alias || {}),
        three: threeRoot,
        react: pkgRoot('react'),
        'react/jsx-runtime': require.resolve('react/jsx-runtime'),
        'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
        'react-dom': pkgRoot('react-dom'),
        'react-dom/client': require.resolve('react-dom/client'),
        'react-redux': pkgRoot('react-redux'),
        redux: pkgRoot('redux'),
        scheduler: pkgRoot('scheduler'),
      };

      webpackConfig.resolve.fallback = {
        ...(webpackConfig.resolve.fallback || {}),
        path: require.resolve('path-browserify'),
      };

      const oneOf = webpackConfig.module.rules.find((r) => Array.isArray(r.oneOf))?.oneOf;
      if (oneOf) {
        /* Transpile react-planner + demo catalog JSX (outside src/) — must run before generic rules */
        oneOf.unshift({
          test: /\.(js|mjs|jsx)$/,
          include: plannerRoot,
          use: [
            {
              loader: require.resolve('babel-loader'),
              options: {
                presets: [require.resolve('babel-preset-react-app')],
                cacheDirectory: true,
                cacheCompression: false,
                compact: false,
              },
            },
          ],
        });
      }

      /* react-icons (used by react-planner) — webpack 5 "fullySpecified" breaks extensionless ../lib/iconBase */
      webpackConfig.module.rules.unshift({
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
        include: /node_modules[\\/]react-icons/,
      });

      return webpackConfig;
    },
  },
};
