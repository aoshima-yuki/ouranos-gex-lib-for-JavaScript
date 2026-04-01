(() => {
  function start() {
    if (!window.SpatialId || !window.SpatialId.Space) {
      const m = document.getElementById("msg");
      if (m) {
        m.textContent = "ライブラリが読み込めていません。";
      }
      return;
    }

    if (!window.L) {
      const m = document.getElementById("msg");
      if (m) {
        m.textContent = "地図ライブラリが読み込めていません。";
      }
      return;
    }

    const Space = window.SpatialId.Space;

    function $(id) {
      const el = document.getElementById(id);
      if (!el) throw new Error("Element #" + id + " not found");
      return el;
    }

    const form = $("calc-form");
    const zfxyEl = $("zfxy");
    const msgEl = $("msg");

    let currentLayer = null;
    let currentMarker = null;

    const map = L.map("map").setView([35.672195798131135, 139.7409559872962], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    function draw(space) {
      const geo = space.toGeoJSON();
      const c = space.center;

      if (currentLayer) map.removeLayer(currentLayer);
      if (currentMarker) map.removeLayer(currentMarker);

      currentLayer = L.geoJSON(geo, {
        style: function () {
          return {
            color: "#2457d6",
            weight: 2,
            fillColor: "#2457d6",
            fillOpacity: 0.2
          };
        }
      }).addTo(map);

      currentMarker = L.marker([c.lat, c.lng]).addTo(map);

      map.fitBounds(currentLayer.getBounds(), {
        padding: [20, 20]
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      try {
        const z = parseInt($("z").value, 10);
        const h = parseFloat($("h").value);
        const lng = parseFloat($("lng").value);
        const lat = parseFloat($("lat").value);

        if ([z, h, lng, lat].some(function (v) { return Number.isNaN(v); })) {
          msgEl.textContent = "入力値を確認してください。";
          zfxyEl.textContent = "-";
          return;
        }

        const space = Space.getSpaceByLocation({ lat, lng, alt: h }, z);

        zfxyEl.textContent = space.zfxyStr.replace(/^\//, "");
        msgEl.textContent = "計算しました。";

        draw(space);
      } catch (err) {
        console.error(err);
        msgEl.textContent = "計算中にエラーが発生しました。";
        zfxyEl.textContent = "-";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", start);
})();
