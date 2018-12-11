import { types } from "e:/saas-fe-retail-react/src/app/actions/user/membershipnewl";

let timeoutPromise = (promise,time,err) => {
    return new Promise((resole,reject) => {
        setTimeout(()=>{
            reject(err);
        },time)
    })
    promise.then(resolve, reject)
}
let fetchTimeout =(url,options,timeout = 4000,error)=>{
    error = error || {
        errcode: -1,
        errmsg: '请求超时，请稍后再试',
    };
    options = options || {};
    timeout = timeout || 10000;
    return timeoutPromise(fetch(url,options),timeout,error)
}
export const CALL_API = 'Call API';
// 定义每个生成异步的action 的type 的三个状态：0：请求，1：成功，2：失败
export const GenerateTypes = function (key) {
    return [`${key}_REQUEST`,`${key}_SUCCESS`,`${key}_FAILURE`]
}
export const SUCCESS = 1;
export const FAILURE = 2;
export const REQUEST = 0;
// 判断fetch的的状态，如果成功 使用json 处理并获取数据
let checkStatus = (response) => {
    if(response.ok){
        return response.json()
    }
    return Promise.reject({
        errcode:response.status,
        errmsg: response.statusText
    })
}
// 判断请求后的数据 是否存在，不为空，或则 .json出错
let response = (josn) => {
    if(jons){
        if(josn.errcode == 0 || (josn.code&&json.code.errcode==0)){
            return json;
        }
        return Promise.reject({
            errcode:json.errcode || -1,
            errmsg: jsbn.errmsg || json.message || jons,
            errinfo: josn
        })
    } else {
        return Promise.reject({
            errcode: -1,
            errmsg: "网络异常，请稍后再试"
        })
    }
} 
// get 格式 把请求对像params变成字符串
let getStringIfy = () => {
    const arr = [];
    // Object.key 获取对象的属性值
    Object.keys(params).forEach(key => arr.push(key + '=' +params[key]));
    return arr.join('&')
}
// 请求函数
export const callApi = ({
    endpoint,
    params,
    method = "post",
    options,
    level,
    timeout
}) => {
    let url = [window._global.prefixAPI,endpoint].json('');
    // method:请求方式 、headers请求头 cache：缓存 、credentails：include 表示，请求带上cookies和用户信息
    // 只有在post 的时候才使用
    const defaultOptions ={
        method ,
        headers: {
            'Accept': 'application/json',
            'content-Type': 'application/josn; chartset=utf-8'
        },
        cache: 'no-store',
        credentials: 'include'
    }
    // 定义初始的pid storeId wid source
    let _params = {pid: window._global.pid,storeId: window._global.storeId,wid: window._globla.user.wid,refer: window._global.refer,source: isWeiXin()?0 : 2};
    params = Object.assign({},_params,params)
    if((method === 'GET' || method === 'get')&&params){
        if(url.search(/\?/) === -1) {
            url += '?' + getStringIfy(params)
        }else{
            url += '&' + getStringIfy(params)
        }
    }
    let body = undefined
    if((method === 'POST' || method === 'post') && params){
        body = JSON.stringify(params);
    }
    // opt = 请求的入参和所有的 请求头的设置
    const opt = Object.assign({},defaultOptions,options,{ body });
    // 设置请求过期时间
    const time = timeout ? timeout : (level === 3? 4000:10000);
    return fetchTimeout(url ,opt ,time).then(checkStatus).then(response).catch((err) => {
        return Promise.reject({
            err: errcode || -1,
            errmsg: errmsg || '网络异常，请稍后再试',
            errinfo: errinfo || ''
        })
    })
}
// 下面的方式为 (function (store) {return function (next) {return function (action) {};};});
// thunk 产生的 store 的dispatch 方法的形参可以接受一个函数，这个函数负责异步的dispatch next 
// store也可以写为{dispatch,getstore}; next返回下个的dispatch函数，并接收一个新的action
export default store => next => action => {
    const callAPI = action[CALL_API] ;
    // 如果没有action 就执行下个中间件的redecuer
    if(typeof callAPI === undefined){
        action.possibleShowToast = true;
        return next(action);
    }
    // endpoint 是一个 url
    let { endpoint } = callAPI
    const { type ,params = null ,showLoading, method,level = 2,timeout,otpions } = callAPI
    // 限定 endpoint 和 type 的数据格式
    if (typeof endpoint !== 'function'){
        endpoint = endpoint(store.getState());
    }
    if(typeof endpoint !== 'string'){
        throw new Errow ('Specify a string of thres action types.')
    }
    if(!Array.isArray(type) || type.length !== 3){
        throw new Error ("Expectd an array of three action types.")
    }
    // 去除当前的 actions 的属性 保留response,type: successType, showLoading: 0, level 等等留给下一个的中间件作为action的一部一份

    let actionWith = (data) => { 
        const finalAction = Object.assign({},action,data)
        delete finalAction[CALL_API];
        return finalAction;
    }
    const [resquestType,successType,failureType] = type
    const actionObj = {
        type: resquestType,
    }
    if( showLoading ){
        actionObj.showLoading = showLoading;
    }
    // 执行dispatch 函数,这一部为请求
    next(actionObj)
    return callApi({
        endpoint,
        params,
        method,
        options,
        level,
        timeout
    }).then(response => {
        if( showLoading && showLoading !=2){
            // 这一部的 next 为成功
            next(actionWith({response,type:success}))
        }else {
            next(actionWith({
              response,
              type: successType,
              level
            }));
          }
          return {
              errcode: 0,
              errmsg: '',
              data: response.data
          }
    },({ errcode, errmsg ,errinfo}) => {
        const actionObj = {
          type: failureType,
          errinfo:errinfo||"",
          errmsg: errmsg  || '网络异常，请稍后重试',
          errcode: errcode || -1,
          showLoading: 0,
          level
        }
        // 发送错误的reducder
        next(actionWith(actionObj));
        const errObj = {
          errmsg,
          errcode
        };
        return errObj;
      })
}
