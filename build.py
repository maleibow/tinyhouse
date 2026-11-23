"""Inline src/gen.js and src/main.js into src/page.html -> index.html"""
s=open('src/page.html').read()
gen=open('src/gen.js').read().replace("if(typeof module!=='undefined')module.exports=buildWorld;",'')
s=s.replace('/*GEN*/',gen).replace('/*MAIN*/',open('src/main.js').read())
open('index.html','w').write(s)
