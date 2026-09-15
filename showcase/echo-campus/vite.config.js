import {defineConfig} from "vite";
export default defineConfig({base:"./",server:{host:"127.0.0.1",port:5190,strictPort:true,proxy:{"/api":{target:"http://127.0.0.1:5189",ws:true}}},build:{target:"es2022",chunkSizeWarningLimit:1500}});
