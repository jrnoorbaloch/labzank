#!/usr/bin/env bash
# Artifact hosts reserve "_"-prefixed paths: move out/_next → out/next and rewrite refs.
set -e
cd out
rm -rf next && mv _next next
for d in next/static/*/; do b=$(basename "$d"); [[ $b == _* ]] && true; done
grep -rl "_next/" --include="*.html" --include="*.js" --include="*.css" --include="*.txt" . | xargs sed -i 's#_next/#next/#g'
# build-id manifests start with "_" too
for f in next/static/*/_*; do mv "$f" "$(dirname "$f")/$(basename "$f" | sed 's/^_//')"; done
rm -rf 404 404.html _not-found *.txt
# a build-id folder can itself start with "_" — rename it and its references
for d in next/static/_*/; do
  [ -d "$d" ] || continue
  old=$(basename "$d"); new="b${old}"
  mv "next/static/$old" "next/static/$new"
  grep -rl "$old" --include="*.html" --include="*.js" . | xargs -r sed -i "s#$old#$new#g"
done
find next -type d -name "_*" -empty -delete
