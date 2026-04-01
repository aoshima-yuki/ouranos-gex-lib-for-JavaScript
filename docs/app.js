(() => {
  function start() {
    const Space = window.SpatialId.Space;

    function $(id) {
      return document.getElementById(id);
    }

    const form = $("calc-form");
    const reverseForm = $("reverse-form");

    const zfxyEl = $("zfxy");
    const msgEl = $("msg");

    const lngEl = $("reverse-lng");
    const latEl = $("reverse-lat");
    const altEl = $("reverse-alt");

    let currentLayer = null;
    let currentMarker = null;

    // 地図
    const map = L.map("map").setView([35.68, 139.76], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    function draw(space) {
      const geo = space.toGeoJSON();
      const c = space.center;

      if (currentLayer) map.removeLayer(currentLayer);
      if (currentMarker) map.removeLayer(currentMarker);

      currentLayer = L.geoJSON(geo).addTo(map);
      currentMarker = L.marker([c.lat, c.lng]).addTo(map);

      map.fitBounds(currentLayer.getBounds());
    }

    // 計算
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      try {
        const z = parseInt($("z").value);
        const h = parseFloat($("h").value);
        const lng = parseFloat($("lng").value);
        const lat = parseFloat($("lat").value);

        const space = Space.getSpaceByLocation({ lat, lng, alt: h }, z);

        zfxyEl.textContent = space.zfxyStr.replace("/", "");
        msgEl.textContent = "計算しました";

        draw(space);
      } catch (e) {
        msgEl.textContent = "入力エラー";
      }
    });

    // 逆変換
    reverseForm.addEventListener("submit", (e) => {
      e.preventDefault();

      try {
        const id = $("space-id").value.trim();

        const space = Space.getSpaceByZFXY(id);
        const c = space.center;

        lngEl.textContent = c.lng.toFixed(6);
        latEl.textContent = c.lat.toFixed(6);
        altEl.textContent = c.alt;

        draw(space);
      } catch (e) {
        alert("形式エラー");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", start);
})();
