# STACKED — A Digital Twin of Everyday Habits

STACKED helps users understand how everyday routines connect to their personal goals and wellbeing. Users add profile information, set goals, and record daily check-ins. The application uses that information to show activity patterns, generate personalized AI reflections, and illustrate possible future scenarios.

STACKED is designed to make progress easier to notice and reflect on. Its projections are exploratory scenarios—not promises about what will happen.

## Key features

- **Personalized profiles:** Users enter information across areas such as physical health, sleep, mental wellbeing, productivity, academics, and lifestyle.
- **Goal tracking:** Users define routines and record whether they completed each goal, with an optional actual value.
- **Habit heatmap:** A calendar view shows daily goal completion, helping users spot consistent periods and gaps.
- **Progress analytics:** Weekly completion percentages and graphs help users review how their activity changes over time.
- **AI-powered insights:** The analysis service uses available profile data to create personalized summaries and suggested improvements.
- **Future-self letters:** AI-generated letters reflect the selected time horizon, profile information, and recent recorded activity.
- **Future scenarios:** Users can compare an illustrative current-pattern path with a suggested-guideline path.
- **Interactive Future You view:** A draggable timeline and 3D character make it possible to explore different milestones visually.

## How STACKED works

### 1. Build a personal baseline

Users provide profile information across the areas they want to track. Saved quantities and ratings describe their current profile and establish a starting point for analysis.

STACKED uses the information the user has entered. If a profile area is incomplete, that data is treated as unavailable rather than filled in with an assumed value.

### 2. Create goals and record check-ins

Users create goals based on the routines they want to build. A check-in records the goal, date, completion status, and any optional actual value.

Over time, these entries create a history of recorded activity. The history helps STACKED compare goals the user set with the check-ins they logged. Its usefulness depends on the goals and check-ins being recorded accurately.

### 3. Review daily completion and consistency

The tracker identifies which goals were active on a given date and counts how many were completed. It uses the completion rate to set that date’s heatmap intensity:

`Daily completion = completed eligible goals / total eligible goals`

Days with a higher completion rate receive a stronger visual intensity. This makes it easier to see clusters of completed days, gaps, and changes in routine. Dates without eligible goals and future dates are not treated as ordinary missed check-ins.

The weekly progress line calculates a completion percentage for each of the last seven days and displays the average. The letter service also estimates consistency over a 30-day window by comparing completed check-ins with expected check-ins based on active goals and their frequency.

These measures describe the check-ins stored in STACKED. They cannot account for activities that users did not log.

### 4. Generate personalized insights and letters

For an insight or letter, STACKED combines the available profile information with relevant activity data. A user can select a letter horizon, such as three or six months. The AI service receives that horizon and the activity summary, then generates a reflection grounded in the information available.

Recorded consistency can change the tone and focus of the letter. A history of regular check-ins gives the reflection evidence of follow-through to acknowledge. When check-ins are less consistent, it can encourage a manageable next step instead of suggesting that progress has already happened.

Letters are AI-generated reflections, not real messages from the user’s future self. Their personalization is limited by the profile details and activity history provided.

### 5. Explore illustrative future scenarios

STACKED uses completed profile data to establish a baseline for its overview analysis. The analysis service generates two possible paths:

- **Current-pattern path:** An illustration based on the user’s current profile and recorded patterns.
- **Suggested-guideline path:** An illustration of how suggested changes could shape a different path.

The scenarios include summaries and score points across short- and long-term milestones. They help users compare possibilities and reflect on potential changes. They are illustrative, not scientifically established forecasts or guaranteed outcomes.

## Interactive visual experience

### Heatmap and progress graphs

The calendar heatmap communicates daily goal completion through colour intensity. The weekly progress line shows how the daily completion percentages vary across the week. Scenario graphs display the two illustrative paths across future milestones.

These visualizations help users interpret the recorded data and compare scenarios. They do not make the underlying projections more certain.

### Future timeline

The Future You page includes a draggable timeline with multiple milestones. Moving the timeline changes the selected milestone and its associated scenario summary, allowing users to explore how each illustrative path develops over time.

### 3D model with Three.js

Three.js renders the interactive 3D character shown in the Future You experience. The model provides a visual focal point while users explore the timeline and compare milestones.

### Animation with GSAP

GSAP powers interface animations and transitions, including motion between timeline states and changes in the visual presentation. These effects help make the experience feel responsive and clarify when the selected milestone changes. GSAP handles presentation; it does not calculate scores or scenarios.

## Screenshots

### Personalized future-self letter
<img width="820" height="853" alt="Screenshot 2026-11-21 023025" src="https://github.com/user-attachments/assets/689690ec-fa1e-469e-9b6e-16294bc63bf1" />

### Future You timeline
<img width="1615" height="835" alt="Screenshot 2026-11-21 023052" src="https://github.com/user-attachments/assets/b73e6422-9a41-4643-be35-f5d3f6151015" />


### Tracker heatmap and progress
<img width="1677" height="647" alt="Screenshot 2026-11-21 023251" src="https://github.com/user-attachments/assets/69d58aca-54e2-437f-ae25-10e5d110bb2f" />

## Technology

- **Frontend:** HTML, CSS, and JavaScript
- **Backend:** Node.js and Express
- **Database:** MongoDB
- **AI:** OpenRouter API for generated insights, scenario summaries, and letters
- **3D rendering:** Three.js
- **Animation:** GSAP

## Important note

STACKED provides habit-tracking tools and AI-generated reflections for exploration and motivation. Its future scenarios are illustrative and depend on the information and check-ins available. They are not guaranteed predictions, medical advice, or a substitute for professional guidance.
