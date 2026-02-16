function string(str){
    let result="";
    let count=0;
    for(let i=0; i< string.length ; i++){
        if(str[i] === str[i+1]){
            count++;

        }else{
            result += str[i] + count;
            count =1;
        }
        return result;
    }
}
console.log(string("aaabbccccd"))