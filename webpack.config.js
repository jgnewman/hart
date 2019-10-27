const path = require("path")
const webpack = require("webpack")
const CleanWebpackPlugin = require("clean-webpack-plugin")
const HtmlWebPackPlugin = require("html-webpack-plugin")

const config = {
  entry: {
    dev: "./dev/app.js",
  },

  output: {
    filename: "[name].js",
    publicPath: "/",
  },

  resolve: {
    extensions: [".js", ".jsx"],
  },

  plugins: [
    new CleanWebpackPlugin(),

    new HtmlWebPackPlugin({
      template: "./dev/index.html",
      filename: "./index.html",
      vars: {}
    }),
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
                pragma: "hart"
              }]]
            }
          },
        ]
      },
    ]
  }
}

if (process.env.NODE_ENV === "development") {
  config.devtool = "source-map"
}

module.exports = config
