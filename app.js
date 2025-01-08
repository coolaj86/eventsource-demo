// /api/authn/sse
let eventSource = new EventSource(`/api/notify?access_token=secret&foo=bar`, {
  withCredentials: false,
});

/** @type {HTMLElement} */ //@ts-expect-error
let $notificationsDiv = document.querySelector("[data-id='notifications']");

/** @param {Event} ev */
eventSource.onopen = function (ev) {
  console.log(`opened`, eventSource.url);
};

/** @param {MessageEvent} ev */
eventSource.onmessage = function (ev) {
  console.log(`EventSource event:`, ev);
  let data = JSON.parse(ev.data);
  let $messageElement = document.createElement("div");
  $messageElement.textContent = `Message: ${data.message}`;
  $notificationsDiv.appendChild($messageElement);
};
// eventSource.addEventListener("squash", function (ev) {
//   console.log(`EventSource squash:`, ev);
// });
// eventSource.addEventListener("pickle", function (ev) {
//   console.log(`EventSource pickle:`, ev);
// });
// eventSource.addEventListener("banana", function (ev) {
//   console.log(`EventSource banana:`, ev);
// });

/** @param {Event} ev */
eventSource.onerror = function (ev) {
  console.error("EventSource failed:", ev);
  // eventSource.readyState` is checked to see if it equals `EventSource.CLOSED
  eventSource.close();
};

setTimeout(function () {
  console.log("EventSource closing...");
  eventSource.close();
}, 50000);
