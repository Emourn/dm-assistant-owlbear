import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

socket.on("connect", () => {
    console.log("Connected as", socket.id);
    
    // We try to create a room as DM
    socket.emit("room:create", (res) => {
        console.log("DM Room created:", res.code);
        const roomCode = res.code;
        
        // Push a state
        socket.emit("state:push", {
            combat: {
                isActive: true,
                battleMap: {
                    id: "test-map",
                    tokens: [
                        { id: "token1", combatantId: "char1", position: { col: 5, row: 5 } }
                    ]
                },
                combatants: [
                    { id: "char1", sourceId: "char1", name: "Hero" }
                ]
            }
        });

        // Try to move a token
        setTimeout(() => {
            console.log("Emitting token:move...");
            socket.emit("token:move", { tokenId: "token1", newPosition: { col: 7, row: 7 } }, (res) => {
                console.log("token:move response:", res);
            });
        }, 1000);
    });
});

socket.on("state:sync", (state) => {
    console.log("Received state:sync", JSON.stringify(state.map?.tokens, null, 2));
});

socket.on("token:moved", (data) => {
    console.log("Received token:moved (DM)", data);
});
