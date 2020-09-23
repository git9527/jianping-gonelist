import request from "../utils/request";

export function getSiteInfo() {
  return request("/info/site");
}

export function getAllFiles(path, pass = "") {
  return request({
    method: "get",
    url: "/onedrive/getpath",
    params: {
      path: path || "/"
    },
    headers: {
      pass: pass
    }
  });
  // console.log("pass = ", pass)
  // if(pass == "") {
  //   console.log("无密码")
  //   return request({
  //     method: "get",
  //     url: `${baseURL}/onedrive/getpath`,
  //     params: {
  //       path: path || '/'
  //     }
  //   })
  // } else {
  //   console.log("有密码")
  //   return request({
  //     method: "get",
  //     url: `${baseURL}/onedrive/getpath`,
  //     params: {
  //       path: path || '/'
  //     },
  //     headers: {
  //       "pass": pass
  //     }
  //   })
  // }
}
export function logout() {
  return request({
    method: "get",
    url: "/cancelLogin"
  });
}
export function getReadme(path, pass = "") {
  return request({
    method: "get",
    url: "/README",
    params: {
      path: path || "/"
    },
    headers: {
      pass: pass
    }
  });
}
