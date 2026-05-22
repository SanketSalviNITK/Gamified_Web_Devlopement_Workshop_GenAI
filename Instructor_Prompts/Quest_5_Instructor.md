# Quest 5: Instructor Test Prompt

*This is a pre-generated, highly detailed prompt simulating what ChatGPT would produce.*

> Act as a Frontend JavaScript Developer. I need you to build a static chatbot interface for my `index.html`.
> 1. Add HTML markup to `index.html` for a chat window fixed to the bottom-right corner (`bottom: 20px, right: 20px`). Include a message history div and an input field with a send button.
> 2. Style the chat window using pure CSS in the `<style>` tag to match a dark, neon glassmorphism aesthetic.
> 3. Create a `chatbot.js` file and link it in the HTML.
> 4. In `chatbot.js`, write an event listener for the send button (and the Enter key). When triggered, append the user's text to the message history.
> 5. Immediately after, use regex to check if the input contains the word `skills` or `experience`. If it does, append a bot response saying: "I am highly proficient in HTML, CSS, JavaScript, and Three.js 3D rendering!"
> 6. If the input doesn't match any keywords, respond with "I'm just a simple bot, I don't understand that yet!"
> 7. Ensure the message history container `scrollTop` is updated so it always auto-scrolls to the newest message.
