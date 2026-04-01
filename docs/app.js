(() => {
  console.log("[app.js] loaded");

  function start() {
    if (!window.SpatialId || !window.SpatialId.Space) {
      console.error("SpatialId (UMD) が読み込まれていません。index.html の <script src> のパス/順序を確認してください。");
      var m = document.getElementById("msg");
      if (m) {
        m.textContent = "ライブラリが読み込めていません。ページのスクリプト設定をご確認ください。";
      }
      return;
    }

    if (!window.L) {
      console.error("Leaflet が読み込まれていません。");
      var m2 = document.getElementById("msg");
      if (m2) {
        m2.textContent = "地図ライブラリが読み込めていません。";
      }
      return;
    }

    function $(id) {
      var el = document.getElementById(id);
      if (!el) throw new Error("Element #" + id + " not found");
      return el;
    }

    var formEl = $("calc-form");
    var reverseFormEl = $("reverse-form");

    var msgEl = $("msg");
    var reverseMsgEl = $("reverse-msg");

    var zfxyEl = $("zfxy");
    var clearEl = $("clear");

    var fillCurrentEl = $("fill-current");
    var spaceIdInputEl = $("space-id");
    var reverseLngEl = $("reverse-lng");
    var reverseLatEl = $("reverse-lat");
    var reverseAltEl = $("reverse-alt");

    var zoomPlusBtn = document.getElementById("zoom-plus");
    var zoomMinusBtn = document.getElementById("zoom-minus");

    var aroundListEl = document.getElementById("around-list");
    var parentListEl = document.getElementById("parent-list");
    var childrenListEl = document.getElementById("children-list");

    var Space = window.SpatialId.Space;
    var currentSpace = null;

    // Leaflet map
    var map = L.map("map").setView([35.681236, 139.767125], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    var currentGeoJsonLayer = null;
    var currentMarker = null;

    function resetLists() {
      aroundListEl.innerHTML = '<div class="mini">未計算</div>';
      parentListEl.innerHTML = '<div class="mini">未計算</div>';
      childrenListEl.innerHTML = '<div class="mini">未計算</div>';
    }

    function resetReverseResult() {
      reverseLngEl.textContent = "-";
      reverseLatEl.textContent = "-";
      reverseAltEl.textContent = "-";
    }

    function normalizeZfxyString(value) {
      return (value || "").trim().replace(/^\//, "");
    }

    function rowForSpace(space) {
      var div = document.createElement("div");
      div.className = "list-item";

      var left = document.createElement("div");
      left.innerHTML =
        "<div><strong>" + space.zfxyStr.replace(/^\//, "") + "</strong></div>" +
        "<div class='mini'>zoom=" + space.zoom + "</div>";

      div.appendChild(left);

      div.style.cursor = "pointer";
      div.addEventListener("click", function () {
        currentSpace = space;
        renderAll(space);
        msgEl.textContent = "選択した空間IDを表示しました。";
      });

      return div;
    }

    function renderMain(space) {
      zfxyEl.textContent = space.zfxyStr.replace(/^\//, "");
    }

    function renderAround(space) {
      try {
        var around = space.surroundings();
        aroundListEl.innerHTML = "";

        if (!around || around.length === 0) {
          aroundListEl.innerHTML = '<div class="mini">周辺がありません</div>';
          return;
        }

        for (var i = 0; i < around.length; i++) {
          aroundListEl.appendChild(rowForSpace(around[i]));
        }
      } catch (e) {
        console.error(e);
        aroundListEl.innerHTML = '<div class="mini">周辺の表示でエラーが発生しました</div>';
      }
    }

    function renderParent(space) {
      try {
        var parent = space.parent();
        parentListEl.innerHTML = "";
        parentListEl.appendChild(rowForSpace(parent));
      } catch (e) {
        console.error(e);
        parentListEl.innerHTML = '<div class="mini">親の表示でエラーが発生しました</div>';
      }
    }

    function renderChildren(space) {
      try {
        var children = space.children();
        childrenListEl.innerHTML = "";

        if (!children || children.length === 0) {
          childrenListEl.innerHTML = '<div class="mini">子がありません</div>';
          return;
        }

        for (var i = 0; i < children.length; i++) {
          childrenListEl.appendChild(rowForSpace(children[i]));
        }
      } catch (e) {
        console.error(e);
        childrenListEl.innerHTML = '<div class="mini">子の表示でエラーが発生しました</div>';
      }
    }

    function renderMap(space) {
      try {
        var geom = space.toGeoJSON();

        if (currentGeoJsonLayer) {
          map.removeLayer(currentGeoJsonLayer);
        }
        if (currentMarker) {
          map.removeLayer(currentMarker);
        }

        currentGeoJsonLayer = L.geoJSON(geom, {
          style: function () {
            return {
              color: "#2457d6",
              weight: 2,
              fillColor: "#2457d6",
              fillOpacity: 0.2
            };
          }
        }).addTo(map);

        var c = space.center;
        currentMarker = L.marker([c.lat, c.lng]).addTo(map);

        map.fitBounds(currentGeoJsonLayer.getBounds(), {
          padding: [20, 20]
        });
      } catch (e) {
        console.error(e);
        msgEl.textContent = "地図表示中にエラーが発生しました。";
      }
    }

    function renderAll(space) {
      renderMain(space);
      renderAround(space);
      renderParent(space);
      renderChildren(space);
      renderMap(space);
    }

    formEl.addEventListener("submit", function (ev) {
      ev.preventDefault();

      var lat = parseFloat(($("lat").value || "").trim());
      var lng = parseFloat(($("lng").value || "").trim());
      var z = parseInt(($("z").value || "25").trim(), 10);
      var h = parseFloat(($("h").value || "0").trim());

      if ([lat, lng, z, h].some(function (v) { return Number.isNaN(v); })) {
        msgEl.textContent = "入力値を確認してください（緯度・経度・ズーム・高さ）。";
        zfxyEl.textContent = "-";
        resetLists();
        return;
      }

      if (z < 0 || z > 30) {
        msgEl.textContent = "ズームレベルは 0〜30 の範囲で入力してください。";
        return;
      }

      try {
        currentSpace = Space.getSpaceByLocation({ lat: lat, lng: lng, alt: h }, z);
        renderAll(currentSpace);
        msgEl.textContent = "計算しました。";
      } catch (e) {
        console.error(e);
        msgEl.textContent = "計算中にエラーが発生しました。入力値とズームを確認してください。";
        zfxyEl.textContent = "-";
        resetLists();
      }
    });

    reverseFormEl.addEventListener("submit", function (ev) {
      ev.preventDefault();

      var input = normalizeZfxyString(spaceIdInputEl.value);

      if (!input) {
        reverseMsgEl.textContent = "空間IDを入力してください。";
        resetReverseResult();
        return;
      }

      try {
        var space = Space.getSpaceByZFXY(input);
        var c = space.center;

        currentSpace = space;
        reverseLngEl.textContent = c.lng.toFixed(6);
        reverseLatEl.textContent = c.lat.toFixed(6);
        reverseAltEl.textContent = String(c.alt);
        reverseMsgEl.textContent = "変換しました。";

        renderAll(space);
      } catch (e) {
        console.error(e);
        reverseMsgEl.textContent = "空間IDの形式を確認してください。例: 25/22/18827764/14674339";
        resetReverseResult();
      }
    });

    if (fillCurrentEl) {
      fillCurrentEl.addEventListener("click", function () {
        if (!currentSpace) {
          reverseMsgEl.textContent = "先に座標から空間IDを計算してください。";
          return;
        }
        spaceIdInputEl.value = currentSpace.zfxyStr.replace(/^\//, "");
        reverseMsgEl.textContent = "現在の計算結果を入力しました。";
      });
    }

    if (zoomPlusBtn) {
      zoomPlusBtn.addEventListener("click", function () {
        if (!currentSpace) {
          msgEl.textContent = "まず入力して「計算」を実行してください。";
          return;
        }

        var c = currentSpace.center;
        var nextZoom = currentSpace.zoom + 1;

        if (nextZoom > 30) {
          msgEl.textContent = "これ以上ズームを上げられません（最大 30）。";
          return;
        }

        currentSpace = Space.getSpaceByLocation(
          { lat: c.lat, lng: c.lng, alt: c.alt },
          nextZoom
        );

        $("z").value = String(currentSpace.zoom);
        renderAll(currentSpace);
        msgEl.textContent = "ズームを " + nextZoom + " に変更しました。";
      });
    }

    if (zoomMinusBtn) {
      zoomMinusBtn.addEventListener("click", function () {
        if (!currentSpace) {
          msgEl.textContent = "まず入力して「計算」を実行してください。";
          return;
        }

        var c = currentSpace.center;
        var nextZoom = currentSpace.zoom - 1;

        if (nextZoom < 0) {
          msgEl.textContent = "これ以上ズームを下げられません（最小 0）。";
          return;
        }

        currentSpace = Space.getSpaceByLocation(
          { lat: c.lat, lng: c.lng, alt: c.alt },
          nextZoom
        );

        $("z").value = String(currentSpace.zoom);
        renderAll(currentSpace);
        msgEl.textContent = "ズームを " + nextZoom + " に変更しました。";
      });
    }

    clearEl.addEventListener("click", function () {
      $("lat").value = "";
      $("lng").value = "";
      $("z").value = "25";
      $("h").value = "0";

      zfxyEl.textContent = "-";
      msgEl.textContent = "入力値をクリアしました。";
      currentSpace = null;
      resetLists();

      spaceIdInputEl.value = "";
      reverseMsgEl.textContent = "";
      resetReverseResult();

      if (currentGeoJsonLayer) {
        map.removeLayer(currentGeoJsonLayer);
        currentGeoJsonLayer = null;
      }
      if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
      }

      map.setView([35.681236, 139.767125], 14);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
