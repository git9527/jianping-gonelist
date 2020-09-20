<template>
  <div class="content">
    <div class="list-wrapper">
      <div class="list-container">
        <div class="header-container">
          <div class="title-icon">
            <h3>
              <span><i class="fa fa-home" aria-hidden="true"></i> </span>
              <span
                v-for="(item, index) in pathStack"
                :key="item"
                @click="toPreviousFolder(index)"
              >
                <span>{{ item === "/" ? " 首页 " : item }}</span>
                <span style="padding-left:5px" v-if="item || item !== '/'"
                  >/
                </span>
              </span>
            </h3>
            <Icon
              type="md-arrow-back"
              id="back"
              @click="back"
              title="返回上一级"
            />
          </div>
        </div>

        <div class="list-body-container">
          <Table
            :loading="loading"
            no-data-text="暂无文件"
            :columns="header"
            :data="files.children"
          >
            <template slot-scope="{ row, index }" slot="name">
              <a
                v-if="row.is_folder"
                :href="
                  pathStack.length === 1
                    ? href + row.name
                    : href + '/' + row.name
                "
                :title="
                  pathStack.length === 1
                    ? href + row.name
                    : href + '/' + row.name
                "
                @click.prevent="toSubFolder(index, row.name)"
              >
                <span class="file-icon"
                  ><i class="fa fa-folder-open" aria-hidden="true"></i>
                </span>
                <span>{{ row.name }}</span>
              </a>
              <div v-else>
                <span class="file-icon">
                  <i
                    class="fa"
                    v-bind:class="['fa-file-' + checkFile(row.name) + '-o']"
                    aria-hidden="true"
                  ></i>
                </span>
                <span
                  @click.prevent="
                    fileClick(
                      row.name,
                      isProduction
                        ? baseurl + 'd' + row.path
                        : row.download_url,
                      index,
                      row.size
                    )
                  "
                  >{{ row.name }}</span
                >
              </div>
            </template>
            <template slot-scope="{ row }" slot="last_modify_time">
              {{ row.last_modify_time | formatTime }}
            </template>
            <template slot-scope="{ row }" slot="size">
              {{ row.size | formatSize }}
            </template>
            <template slot-scope="{ row }" slot="action">
              <i
                v-if="!row.is_folder"
                class="fa fa-download"
                title="下载"
                aria-hidden="true"
                @click="
                  downloadFile(
                    row.name,
                    isProduction ? baseurl + 'd' + row.path : row.download_url,
                    row.size
                  )
                "
              ></i>
            </template>
          </Table>
        </div>
      </div>
    </div>

    <D-Player
      v-on:closeVideo="closeV"
      ref="mydplayer"
      v-show="video.show"
    ></D-Player>
    <A-Player
      v-on:closeAudio="closeA"
      ref="myaplayer"
      v-show="audio.show"
    ></A-Player>

    <Modal v-model="modal" title="加密文件" @on-ok="ok" @on-cancel="cancel">
      <Input v-model="pass" type="password" placeholder="请输入密码" />
      <p style="color: red" v-show="pass_count > 1">密码错误!</p>
    </Modal>
    <Modal v-model="img_modal" title="图片预览" :footer-hide="true">
      <img :src="img_src" alt="" style="width:100%;height:100%" />
    </Modal>
  </div>
</template>

<script>
import { getAllFiles, logout, getReadme } from "../API/api";
import { checkFileType } from "../utils/index";
import DPlayer from "../components/Dplayer";
import APlayer from "../components/Aplayer";
import axios from "axios";

export default {
  name: "Index",
  components: {
    "D-Player": DPlayer,
    "A-Player": APlayer
  },
  data() {
    return {
      header: [
        {
          title: "文件",
          slot: "name",
          key: "is_folder",
          minWidth: 300,
          sortable: true,
          sortType: "desc",
          sortMethod: (a, b, type) => {
            if (type === "desc") {
              return a > b ? -1 : 1;
            } else {
              return a > b ? 1 : -1;
            }
          }
        },
        {
          title: "时间",
          slot: "last_modify_time",
          key: "last_modify_time",
          align: "right",
          width: 200,
          sortable: true,
          //desc倒序 asc顺序
          sortMethod: (a, b, type) => {
            let at = new Date(a);
            let bt = new Date(b);
            if (type === "desc") {
              return at > bt ? -1 : 1;
            } else return at > bt ? 1 : -1;
          }
        },
        {
          title: "大小",
          slot: "size",
          key: "size",
          align: "right",
          width: 110,
          sortable: true,
          //desc倒序升序 asc顺序降序
          sortMethod: (a, b, type) => {
            if (type === "desc") {
              return a > b ? -1 : 1;
            } else return a > b ? 1 : -1;
          }
        },
        {
          title: "操作",
          slot: "action",
          width: 100,
          align: "center"
        }
      ],
      loading: true,
      files: [],
      pathStack: [],
      fullPath: "",
      hash: "",
      // origin + parh + hash
      href: "",
      // origin + path
      baseurl: "",
      video: {
        show: false,
        index: -1, // 点击的元素
        // 记录正在播放视频的文件夹
        hash: ""
      },
      audio: {
        show: false,
        index: -1,
        hash: ""
      },
      isProduction: false,
      readme: "",
      modal: false,
      pass: "",
      pass_count: 0,
      img_modal: false,
      img_src: ""
    };
  },
  created() {
    this.init();
  },
  watch: {
    $route: {
      handler: function() {
        this.init();
      },
      // 深度观察监听
      deep: true
    }
  },
  filters: {
    formatTime(time) {
      return time.replace(/[T,Z]/g, "  ");
    },
    formatSize(size) {
      let result;
      // size为字节
      if (size / 1024 / 1024 / 1024 >= 1) {
        // 可以转化为GB就转化为GB
        result = (size / 1024 / 1024 / 1024).toFixed(2) + "GB";
      } else if (size / 1024 / 1024 >= 1) {
        // 可以转化为MB就转化为MB
        result = (size / 1024 / 1024).toFixed(2) + "MB";
      } else {
        // 否则转化为KB
        result = (size / 1024).toFixed(2) + "KB";
      }
      return result;
    }
  },
  methods: {
    fileClick(fileName, downloadUrl, index, size) {
      const fileType = this.checkFile(fileName);
      if (fileType === "video") {
        this.playVideo(downloadUrl, index);
      } else if (fileType === "image") {
        this.showImage(downloadUrl, index);
      } else if (fileType === "audio") {
        this.playAudio(downloadUrl, index);
      } else {
        this.downloadFile(fileName, downloadUrl, size);
      }
    },
    downloadFile(fileName, url, size) {
      console.log("file size is", size / 1024 / 1024, "MB");
      if (size / 1024 / 1024 <= 5) {
        axios({
          url: url,
          method: "GET",
          responseType: "blob"
        }).then(response => {
          var fileURL = window.URL.createObjectURL(new Blob([response.data]));
          var fileLink = document.createElement("a");
          fileLink.href = fileURL;
          fileLink.setAttribute("download", fileName);
          document.body.appendChild(fileLink);

          fileLink.click();
        });
      } else {
        window.open(url, "_blank");
      }
    },
    init() {
      let currentPath = this.$route.path;
      if (currentPath[currentPath.length - 1] === "/") {
        currentPath = currentPath.slice(0, -1);
      }
      // 通过search来查找对应的文件夹,需要decodeURI一下
      this.pathStack = currentPath.split("/");
      this.fullPath = this.pathStack.join("/");
      console.log("pathStack数组：", this.pathStack);
      this.loading = true;
      getAllFiles(this.baseURL, currentPath, this.pass).then(res => {
        this.loading = false;
        if (res.code === 400) {
          window.location.href = `${this.baseURL}/login`;
        } else if (res.code === 10002) {
          this.$Message.error(res.msg);
        } else if (res.code === 10007) {
          // 需要输入密码
          this.pass_count++;
          this.modal = true;
        } else {
          this.files = res.data;
          if (!this.files.children) {
            this.files.children = [];
          } else {
            // 如果匹配到文件就直接下载
            if (!this.files.is_folder) {
              this.files.children = [];
              this.files.children.push(this.files);
              console.log("下载", this.files.download_url);
              //window.open(this.files.download_url, "_blank")
              // window.location.href = this.files.download_url;
              this.downloadFile(
                this.files.name,
                this.files.download_url,
                this.files.size
              );
            }
          }
        }
      });
      getReadme(this.baseURL, currentPath, this.pass).then(res => {
        this.readme = res.data;
        //console.log(this.readme)
      });
    },
    toSubFolder(index, name) {
      console.log("go to sub folder:", name);
      this.$router.push(this.fullPath + "/" + name);
    },
    back() {
      this.$router.go(-1);
    },
    toPreviousFolder(index) {
      if (index + 1 !== this.pathStack.length) {
        const target = this.pathStack.slice(0, index + 1);
        console.log("to target folder", target, "index", index);
        this.$router.push(target.length === 1 ? "/" : target.join("/"));
      } else {
        this.$Message.warning("已在该目录");
      }
    },
    exit() {
      logout(this.baseURL).then(() => {
        window.location.hash = "";
      });
    },
    playVideo(playUrl, index) {
      // 如果没有正在播放的视频
      console.log(playUrl);
      let video = {
        playUrl: playUrl,
        name: this.files.children[index].name
      };
      if (!this.video.show) {
        this.video.index = index;
        this.video.show = true;
        this.video.hash = this.hash;
        this.$refs.mydplayer.play(video);
      } else {
        //如果有正在播放的视频，判断当前文件夹是否为正在播放的视频的文件夹
        if (this.video.hash === this.hash) {
          // 是正在播放的文件夹
          if (this.video.index === index) {
            // 点击的是相同的视频，关闭视频
            this.$refs.mydplayer.close();
            this.video.index = -1;
          } else {
            // 点击的是不同的视频，switch
            this.video.index = index;
            this.$refs.mydplayer.switch(video);
          }
        } else {
          // 不是正在播放的文件夹，switchVideo
          this.video.index = index;
          this.$refs.mydplayer.switch(video);
          this.video.hash = this.hash;
        }
      }
    },
    playAudio(playUrl, index) {
      let audio = {
        artist: this.files.children[index].name.split("-")[0],
        name: this.files.children[index].name.split("-")[1],
        url: playUrl,
        fullName: this.files.children[index].name
      };
      if (!this.audio.show) {
        this.audio.index = index;
        this.audio.show = true;
        this.audio.hash = this.hash;
        this.$refs.myaplayer.play(audio);
      } else {
        //如果有正在播放的视频，判断当前文件夹是否为正在播放的视频的文件夹
        if (this.audio.hash === this.hash) {
          // 是正在播放的文件夹
          if (this.audio.index === index) {
            // 点击的是相同的视频，关闭视频
            this.$refs.myaplayer.close();
            this.audio.index = -1;
          } else {
            // 点击的是不同的视频，switch
            this.audio.index = index;
            this.$refs.myaplayer.switch(audio);
          }
        } else {
          // 不是正在播放的文件夹，switchaudio
          this.audio.index = index;
          this.$refs.myaplayer.switch(audio);
          this.audio.hash = this.hash;
        }
      }
    },
    closeV() {
      this.video.show = false;
      this.video.index = -1;
    },
    closeA() {
      this.audio.show = false;
      this.audio.index = -1;
    },
    checkFile(name) {
      return checkFileType(name);
    },
    ok() {
      this.init();
    },
    cancel() {
      this.back();
      this.modal = false;
      this.pass_count = 0;
    },
    showImage(url, _index) {
      this.img_modal = true;
      this.img_src = url;
    }
  }
};
</script>

<style>
@import url("../assets/index.css");
</style>
