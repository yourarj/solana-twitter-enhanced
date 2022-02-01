//CSS
import "./main.css";

// Routing.
import { createRouter, createWebHashHistory } from "vue-router";
import routes from "./routes";
// eslint-disable-next-line
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Create the app
import Vue from "vue";
import App from "./App.vue";

Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
})
  .router(router)
  .$mount("#app");
