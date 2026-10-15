mkdir -p config
cat > server.js <<'X'
import http from "node:http";
import config from "./config.js";
http.createServer((req, res) => res.end("ok")).listen(config.port);
console.log("listening on", config.port);
X
cat > config/index.js <<'X'
export default { port: Number(process.env.PORT || 8080) };
X
echo '{"type":"module","scripts":{"start":"node server.js"}}' > package.json
