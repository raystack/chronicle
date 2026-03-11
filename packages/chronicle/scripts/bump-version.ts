import { valid, compare } from "semver"
import fs from "fs/promises"
import path from "path"

const pkgPath = path.join(import.meta.dir, "../package.json")
const pkg = await Bun.file(pkgPath).json()

const gitRef = process.env.GIT_REFNAME
const gitTag = valid(gitRef)

if (gitTag && compare(gitTag, pkg.version) > 0) {
  pkg.version = gitTag
  console.log("Updating version to", gitTag)
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))
}
