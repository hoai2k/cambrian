#!/usr/bin/env bash
# Install the Blender the creature builders are written for.
#
# Every builder under tools/creatures/ and tools/devonian/creatures/ targets Blender 5.2 and
# several of them will not even export on an older one: the glTF exporter's
# export_vertex_color='NAME' is a 5.x option, and 4.x has no such enum item and no
# export_vertex_color_name property at all. Sculpt, materials and rig all run on 4.x; the export
# is where it stops. So this pins the version rather than taking whatever is to hand.
#
# Idempotent: if the pinned version is already installed it does nothing. Set BLENDER_HOME to
# install somewhere other than /opt/blender, BLENDER_CACHE for the download.
set -euo pipefail

VERSION=5.2.1
SERIES=5.2
SHA256=a31f524fa99a527d3d52b7f5aaa68c34e1a19d5a1c9473f79c5cc610fd5b10e9
HOME_DIR=${BLENDER_HOME:-/opt/blender}
CACHE=${BLENDER_CACHE:-/tmp/blender-download}
TARBALL=blender-${VERSION}-linux-x64.tar.xz
URL=https://download.blender.org/release/Blender${SERIES}/${TARBALL}

if [ -x "$HOME_DIR/blender" ] && "$HOME_DIR/blender" --version 2>/dev/null | head -1 | grep -q "$VERSION"; then
  echo "Blender $VERSION already at $HOME_DIR/blender"
  exit 0
fi

case "$(uname -s)/$(uname -m)" in
  Linux/x86_64) ;;
  *) echo "This installs the linux-x64 build only; on anything else install Blender $VERSION yourself and point BLENDER_HOME at it." >&2; exit 1 ;;
esac

mkdir -p "$CACHE" "$HOME_DIR"
if ! [ -f "$CACHE/$TARBALL" ] || ! echo "$SHA256  $CACHE/$TARBALL" | sha256sum -c --status; then
  echo "Fetching $URL"
  curl -fsSL --max-time 900 -o "$CACHE/$TARBALL.part" "$URL"
  mv "$CACHE/$TARBALL.part" "$CACHE/$TARBALL"
fi
# The digest is upstream's own, from download.blender.org/release/Blender5.2/blender-5.2.1.sha256.
echo "$SHA256  $CACHE/$TARBALL" | sha256sum -c --status || { echo "Checksum mismatch for $TARBALL" >&2; exit 1; }

tar -xf "$CACHE/$TARBALL" -C "$HOME_DIR" --strip-components=1

# Prove the install can do the one thing 4.x could not, rather than trusting the version string.
"$HOME_DIR/blender" --background --factory-startup --python-exit-code 1 --python-expr '
import bpy, sys
items = [i.identifier for i in bpy.ops.export_scene.gltf.get_rna_type().properties["export_vertex_color"].enum_items]
assert "NAME" in items, "glTF exporter has no NAME vertex-colour mode: %s" % items
assert "export_vertex_color_name" in bpy.ops.export_scene.gltf.get_rna_type().properties
import numpy
print("BLENDER OK", bpy.app.version_string, "numpy", numpy.__version__)
' 2>&1 | grep -E '^BLENDER OK' || { echo "Installed Blender failed its export check" >&2; exit 1; }

echo "Blender $VERSION at $HOME_DIR/blender"
