import Elysia from "elysia";

export default new Elysia({
    prefix: `/ban`
}).get(`/`, () => { // Get ban info

}).post(`/`, () => { // Ban player

}).delete(`/`, () => { // Unban player

});