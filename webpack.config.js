const path = require("path")
const CleanWebpackPlugin = require("clean-webpack-plugin")
const HtmlWebPackPlugin = require("html-webpack-plugin")
const CompressionPlugin = require('compression-webpack-plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")

const config = {
  entry: { /* See prod and dev config */ },

  output: {
    filename: "[name].js",
    publicPath: "/",
  },

  resolve: {
    extensions: [".js", ".svelte"],
  },

  plugins: [
    new CleanWebpackPlugin(),
  ],

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        include: path.resolve(__dirname, "./dev"),
        use: [
          {
            loader: "babel-loader",
            options: {
              plugins: [["@babel/plugin-transform-react-jsx", {
                pragma: "hart.elem",
                pragmaFrag: "hart.docFrag",
              }]],
            },
          },
        ],
      },
      {
        test: /\.svelte$/,
        use: [
          {
            loader: "svelte-loader",
          },
        ],
      },
    ]
  }
}

if (process.env.NODE_ENV === "development") {
  config.entry.dev = "./dev/app.js"

  config.devtool = "source-map"

  config.plugins.push(new HtmlWebPackPlugin({
    template: "./dev/index.html",
    filename: "./index.html",
    vars: {}
  }))
}

if (process.env.NODE_ENV === "example") {
  config.entry.dev = "./example/app.js"

  config.devtool = "source-map"

  config.plugins.push(new HtmlWebPackPlugin({
    template: "./example/index.html",
    filename: "./index.html",
    vars: {}
  }))

  config.plugins.push(new MiniCssExtractPlugin({
    filename: "styles.css",
  }))

  config.plugins.push(new CopyWebpackPlugin({
    patterns: [{
      from: "./example/assets",
      to: "assets",
    }],
  }))

  config.module.rules[0].include = path.resolve(__dirname, "./example"),

  config.module.rules.push({
    test: /\.(png|svg|jpg|gif|woff2)$/,
    use: ['file-loader'],
  })

  config.module.rules.push({
    test: /\.css$/,
    use: [
      {
        loader: MiniCssExtractPlugin.loader,
      },
      {
        loader: "css-loader",
        options: {sourceMap: true},
      },
    ],
  })
}

if (process.env.NODE_ENV === "ts-development") {
  config.entry.dev = "./devts/app.tsx"

  config.devtool = "source-map"

  config.plugins.push(new HtmlWebPackPlugin({
    template: "./dev/index.html",
    filename: "./index.html",
    vars: {}
  }))

  config.module.rules = [
    {
      test: /\.(js|ts)x?$/,
      include: path.resolve(__dirname, "./devts"),
      use: [
        {
          loader: "babel-loader",
          options: {
            plugins: [["@babel/plugin-transform-react-jsx", {
              pragma: "hart.elem",
              pragmaFrag: "hart.docFrag",
            }]],
          },
        },
        {
          loader: "ts-loader",
        },
      ],
    },
  ]
}

if (process.env.NODE_ENV === "benchmark") {
  config.entry.benchmark = "./benchmarks/benchmarks.js"

  config.plugins.push(new HtmlWebPackPlugin({
    template: "./benchmarks/index.html",
    filename: "./index.html",
    vars: {}
  }))
}

if (process.env.NODE_ENV === "production") {
  config.entry.hart = "./index.js"

  config.plugins.push(new CompressionPlugin({
    algorithm: "brotliCompress",
    compressionOptions: { level: 11 },
  }))
}

if (process.env.NODE_ENV === "test") {
  config.entry.hart = "./tests/templates/base.js"
}

module.exports = config
