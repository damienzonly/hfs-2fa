rm -rf qrcode speakeasy node_modules
npm i

libs="qrcode speakeasy"
for lib in $libs; do
    npx @vercel/ncc build --minify node_modules/$lib/ -o $lib
    mv $lib/index.js $lib.js
    rm -rf $lib
done
