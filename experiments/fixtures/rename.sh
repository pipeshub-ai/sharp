mkdir -p src
cat > src/user.js <<'X'
export function getUser(id, db) { return db.users.find((u) => u.id === id) ?? null; }
X
cat > src/profile.js <<'X'
import { getUser } from "./user.js";
export function profileName(id, db) { return getUser(id, db)?.name ?? "anonymous"; }
X
cat > src/admin.js <<'X'
import { getUser } from "./user.js";
export function isAdmin(id, db) { return getUser(id, db)?.role === "admin"; }
X
echo '{"type":"module"}' > package.json
