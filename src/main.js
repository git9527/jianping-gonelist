import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import "font-awesome/css/font-awesome.min.css";

import { Message, Table, Notice, Icon, Modal, Input } from "view-design";
Vue.prototype.$Message = Message;
Vue.prototype.$Notice = Notice;
Vue.component("Table", Table);
Vue.component("Icon", Icon);
Vue.component("Input", Input);
Vue.component("Modal", Modal);
Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
