const path = require("path")
const webpack = require("webpack")
const CleanWebpackPlugin = require("clean-webpack-plugin")
const HtmlWebPackPlugin = require("html-webpack-plugin")
const CompressionPlugin = require('compression-webpack-plugin')

const config = {
  entry: { /* See prod and dev config */ },

  output: {
    filename: "[name].js",
    publicPath: "/",
  },

  resolve: {
    extensions: [".js", ".jsx"],
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
                pragma: "fragment.hart"
              }]]
            }
          },
        ]
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

if (process.env.NODE_ENV === "production") {
  config.entry.hart = "./index.js"

  config.plugins.push(new CompressionPlugin({
    algorithm: "brotliCompress",
    compressionOptions: { level: 11 },
  }))
}

module.exports = config
