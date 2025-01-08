package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"time"
)

var (
	streamsByID = make(map[string]http.ResponseWriter)
	count       = 0
	intervalID  *time.Ticker
	port        = ":3000" // Default port, can be overridden by environment variable
)

func main() {
	if p := getPort(); p != "" {
		port = ":" + p
	}

	intervalID = time.NewTicker(500 * time.Millisecond)
	go func() {
		for range intervalID.C {
			count++
			fmt.Println("Ticker", count)

			rnd := rand.Float64()
			eventName := "event: banana\n"
			if rnd > 0.75 {
				eventName = "event: pickle\n"
			} else if rnd > 0.5 {
				eventName = ""
			} else if rnd > 0.25 {
				eventName = "event: squash\n"
			}

			data, _ := json.Marshal(map[string]interface{}{
				"message": "Hello from server!",
				"special": eventName,
			})
			msg := fmt.Sprintf(
				": this is a comment\n%signoreme: yo yo yo\nid: banana %d\ndata: %s\nretry: 1000\n\n", eventName, count, string(data))

			for id, w := range streamsByID {
				fmt.Println("Sending event to", id)
				if _, err := fmt.Fprint(w, msg); err != nil {
					log.Printf("closing %s due to error: %v", id, err)
					delete(streamsByID, id)
					continue
				}
				rc := http.NewResponseController(w)
				rc.Flush()
			}
		}
	}()

	http.HandleFunc("GET /api/hello", helloHandler)
	http.HandleFunc("GET /api/notify", notifyPublishHandler)
	http.HandleFunc("POST /api/notify", notifyUpdateHandler)
	http.HandleFunc("PUT /api/notify", notifySetHandler)
	http.HandleFunc("DELETE /api/notify", notifyRemoveHandler)
	http.HandleFunc("/api/notify/", methodNotAllowedHandler) // handle trailing slash
	http.HandleFunc("DELETE /api", deleteAPIHandler)

	log.Printf("Server is running on http://localhost%s", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func helloHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "hello"})
}

func notifyPublishHandler(w http.ResponseWriter, r *http.Request) {
	r.Body.Close()

	id := r.RemoteAddr

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")

	streamsByID[id] = w

	rc := http.NewResponseController(w)
	rc.Flush()

	<-r.Context().Done()
	delete(streamsByID, id)
}

func notifyUpdateHandler(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func notifySetHandler(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func notifyRemoveHandler(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func deleteAPIHandler(w http.ResponseWriter, r *http.Request) {
	intervalID.Stop()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func methodNotAllowedHandler(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func getPort() string {
	// Implement logic to read environment variable for port
	return os.Getenv("PORT")
}
