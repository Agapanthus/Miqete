var webpack = require('webpack'); 

const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const path = require('path');

const sassJsUtil = require('./src/util/sass.js.util');

let RELEASE = false; // TODO: Select Release or not!

let plugs = [  
  new webpack.ProvidePlugin({
    $: "jquery",
    jQuery: "jquery"
  })
];
if(RELEASE) {
  plugs.push(new UglifyJsPlugin());
}

module.exports = {  
  entry: './src/app/app.ts',
  output: {
    filename: './dist/app.js'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.webpack.js', '.web.js', '.ts', '.js', '.elm'],
    alias: {
      modernizr$: path.resolve(__dirname, ".modernizrrc")
    }
  },
  plugins: plugs,
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use:
        {
          loader: 'worker-loader',
          options: { name: "math.worker.compiled.js"}
        }
      }
      ,{
        test: /\.elm$/,
        exclude: [/elm-stuff/, /node_modules/],
        use: [{
            loader: 'elm-webpack-loader',
            options: {
                verbose: true,
                warn: true,
                debug: true
            }
        }]
      }
      ,{
        test: /\.(png|jp(e*)g|svg)$/,  
        use: [{
            loader: 'url-loader',
            options: { 
                limit: 8000, // Convert images < 8kb to base64 strings
                name: 'images/[hash]-[name].[ext]'
            } 
        }]
      }
      ,{ test: /\.ts$/, loader: 'ts-loader' }
      ,{ 
        test: /\.modernizrrc$/,
        loader: "modernizr-loader!json-loader"
      }
      ,{ test: /\.(s*)css$/, use:['style-loader','css-loader',{
          loader: "sass-loader",
          options: {
            functions: { "get($keys)": sassJsUtil.sassGet }
          }
        }]
      }
      ,{
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ["es2015"]
          }
        }
      }
      ,{
          test: /\.(eot|svg|ttf|woff|woff2)$/,
          loader: 'file-loader?name=public/fonts/[name].[ext]'
      }
    ]
  },
  externals: {
    'fs': true
  }
}