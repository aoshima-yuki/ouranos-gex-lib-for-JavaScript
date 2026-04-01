
(() => {
  console.log("[app.js] loaded");

  function start() {
    // UMD の存在確認
    if (!window.SpatialId || !window.SpatialId.Space) {
      console.error("SpatialId (UMD) が読み込まれていません。index.html の <script src> のパス/順序を確認してください。");
      var m = document.getElementById('msg');
      if (m) m.textContent = "ライブラリが読み込めていません。ページのスクリプト設定をご確認ください。";
      return;
    }

    // 要素取得
    function $(id) {
      var el = document.getElementById(id);
      if (!el) throw new Error("Element #" + id + " not found");
      return el;
    }

    var formEl       = $('calc-form');
    var msgEl        = $('msg');
    var zfxyEl       = $('zfxy');
    var tilehashEl   = $('tilehash');
    var centerEl     = $('center');
    var clearEl      = $('clear');

    var zoomPlusBtn  = document.getElementById('zoom-plus');
    var zoomMinusBtn = document.getElementById('zoom-minus');

    var aroundListEl   = document.getElementById('around-list');
    var parentListEl   = document.getElementById('parent-list');
    var childrenListEl = document.getElementById('children-list');

    var Space = window.SpatialId.Space;
    var currentSpace = null;

    // 行生成（共通）
    function rowForSpace(space) {
      var div = document.createElement('div');
      div.className = 'list-item';

      var left = document.createElement('div');
      left.innerHTML = "<div><strong>" + space.zfxyStr.replace(/^\//, "") + "</strong></div>"
                     + "<div class='mini'>zoom=" + space.zoom + ", tilehash=" + space.id + "</div>";

      div.appendChild(left);
      return div;
    }

    // 結果レンダリング
    function renderMain(space) {
      zfxyEl.textContent = space.zfxyStr.replace(/^\//, "");
      tilehashEl.textContent = space.id;
      var c = space.center;
      centerEl.textContent = c.lng.toFixed(6) + ", " + c.lat.toFixed(6) + ", " + c.alt;
    }

    // 周辺レンダリング
    function renderAround(space) {
      try {
        var around = space.surroundings();
        aroundListEl.innerHTML = '';
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

    // 親レンダリング
    function renderParent(space) {
      try {
        var parent = space.parent();
        parentListEl.innerHTML = '';
        parentListEl.appendChild(rowForSpace(parent));
      } catch (e) {
        console.error(e);
        parentListEl.innerHTML = '<div class="mini">親の表示でエラーが発生しました</div>';
      }
    }

    // 子レンダリング
    function renderChildren(space) {
      try {
        var children = space.children();
        childrenListEl.innerHTML = '';
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

    // まとめてレンダリング
    function renderAll(space) {
      renderMain(space);
      renderAround(space);
      renderParent(space);
      renderChildren(space);
      msgEl.textContent = "レンダリング完了: " + space.zfxyStr;
    }

    // 送信（計算）
    formEl.addEventListener('submit', function(ev) {
      ev.preventDefault();

      var lat = parseFloat(($('lat').value || "").trim());
      var lng = parseFloat(($('lng').value || "").trim());
      var z   = parseInt(($('z').value  || "25").trim(), 10);
      var h   = parseFloat(($('h').value || "0").trim());

      if ([lat, lng, z, h].some(function(v){ return Number.isNaN(v); })) {
        msgEl.textContent = "入力値を確認してください（緯度・経度・ズーム・高さ）。";
        zfxyEl.textContent = "-";
        tilehashEl.textContent = "-";
        centerEl.textContent = "-";
        aroundListEl.innerHTML   = '<div class="mini">未計算</div>';
        parentListEl.innerHTML   = '<div class="mini">未計算</div>';
        childrenListEl.innerHTML = '<div class="mini">未計算</div>';
        return;
      }
      if (z < 0 || z > 30) {
        msgEl.textContent = "ズームレベルは 0〜30 の範囲で入力してください。";
        return;
      }

      try {
        currentSpace = Space.getSpaceByLocation({ lat: lat, lng: lng, alt: h }, z);
        renderAll(currentSpace);
      } catch (e) {
        console.error(e);
        msgEl.textContent = "計算中にエラーが発生しました。入力値とズームを確認してください。";
        zfxyEl.textContent = "-";
        tilehashEl.textContent = "-";
        centerEl.textContent = "-";
        aroundListEl.innerHTML   = '<div class="mini">未計算</div>';
        parentListEl.innerHTML   = '<div class="mini">未計算</div>';
        childrenListEl.innerHTML = '<div class="mini">未計算</div>';
      }
    });

    // ズーム +1（中心座標維持）
    if (zoomPlusBtn) {
      zoomPlusBtn.addEventListener('click', function() {
        if (!currentSpace) {
          msgEl.textContent = 'まず入力して「計算」を実行してください。';
          return;
        }
        var c = currentSpace.center;
        var nextZoom = currentSpace.zoom + 1;
        if (nextZoom > 30) {
          msgEl.textContent = 'これ以上ズームを上げられません（最大 30）。';
          return;
        }
        currentSpace = Space.getSpaceByLocation({ lat: c.lat, lng: c.lng, alt: c.alt }, nextZoom);
        $('z').value = String(currentSpace.zoom);
        renderAll(currentSpace);
        msgEl.textContent = "ズームを " + nextZoom + " に変更しました。";
      });
    }

    // ズーム -1（中心座標維持）
    if (zoomMinusBtn) {
      zoomMinusBtn.addEventListener('click', function() {
        if (!currentSpace) {
          msgEl.textContent = 'まず入力して「計算」を実行してください。';
          return;
        }
        var c = currentSpace.center;
        var nextZoom = currentSpace.zoom - 1;
        if (nextZoom < 0) {
          msgEl.textContent = 'これ以上ズームを下げられません（最小 0）。';
          return;
        }
        currentSpace = Space.getSpaceByLocation({ lat: c.lat, lng: c.lng, alt: c.alt }, nextZoom);
        $('z').value = String(currentSpace.zoom);
        renderAll(currentSpace);
        msgEl.textContent = "ズームを " + nextZoom + " に変更しました。";
      });
    }

    // クリア
    clearEl.addEventListener('click', function() {
      $('lat').value = "";
      $('lng').value = "";
      $('z').value   = "25";
      $('h').value   = "0";
      zfxyEl.textContent   = "-";
      tilehashEl.textContent = "-";
      centerEl.textContent = "-";
      aroundListEl.innerHTML   = '<div class="mini">未計算</div>';
      parentListEl.innerHTML   = '<div class="mini">未計算</div>';
      childrenListEl.innerHTML = '<div class="mini">未計算</div>';
      msgEl.textContent    = "入力値をクリアしました。";
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
``
