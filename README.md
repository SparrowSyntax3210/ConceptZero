# STACKED — A Digital Twin of Everyday Habits

STACKED helps users understand how daily routines relate to personal goals and wellbeing. Users create a profile, set goals, and record check-ins. The app uses this information to show activity patterns, generate personalized AI reflections, and explore possible futures.

These scenarios are for reflection, not promises about what will happen.

## Key features

- **Personalized profiles:** Record details about health, sleep, mental wellbeing, productivity, academics, and lifestyle.
- **Goal tracking:** Set routines and log completion, with an optional actual value.
- **Habit heatmap:** View daily goal completion and spot patterns or gaps.
- **Progress analytics:** Review weekly completion rates and activity trends.
- **AI insights:** Get summaries and suggested improvements based on available profile data.
- **Future-self letters:** Read AI-generated reflections shaped by your profile, recent activity, and selected time horizon.
- **Future scenarios:** Compare illustrative current-pattern and suggested-guideline paths.
- **Interactive Future You:** Explore milestones with a draggable timeline and 3D character.

## How STACKED works

### 1. Build a personal baseline

Users enter information for the profile areas they want to track. Saved values and ratings establish a starting point for analysis. Incomplete areas remain unavailable rather than being filled with assumed data.

### 2. Set goals and record check-ins

Users create goals around routines they want to build. Each check-in records the goal, date, completion status, and optional actual value.

These records connect intended routines with logged activity. Their usefulness depends on goals and check-ins being entered accurately.

### 3. Review completion and consistency

For each date, the tracker finds the goals active that day and calculates their completion rate:

`Daily completion = completed eligible goals / total eligible goals`

The heatmap uses this rate to show patterns, gaps, and changes in routine. Dates without eligible goals and future dates are excluded from ordinary missed-check-in calculations.

The weekly progress line averages daily completion rates over the past seven days. Separately, the letter service estimates 30-day consistency by comparing completed check-ins with expected check-ins based on active goals and their frequency.

These metrics reflect logged activity and cannot account for unrecorded habits.

### 4. Generate insights and letters

STACKED combines available profile and activity data to create AI-generated insights and letters. Users can select a letter horizon, such as three or six months.

The reflection can recognize regular check-ins or, when consistency is lower, encourage a manageable next step. Letters are AI-generated and depend on the information available; they are not actual messages from a future self.

### 5. Explore possible scenarios

The overview analysis uses completed profile data to establish a baseline and generate two illustrative paths:

- **Current-pattern path:** Based on the user’s current profile and recorded activity.
- **Suggested-guideline path:** Shows how suggested changes could shape an alternative path.

Summaries and score points across short- and long-term milestones help users compare possibilities. These scenarios are not scientifically established forecasts or guaranteed outcomes.

## Interactive visual experience

### Heatmap and graphs

The heatmap shows daily completion through colour intensity, while the weekly progress line shows changes in completion rates. Scenario graphs compare the two paths across future milestones.

These visuals help users interpret recorded activity and compare scenarios; they do not make projections more certain.

### Future timeline

Users can drag across milestones on the Future You timeline. The selected milestone and its scenario summary update as they explore each path.

### Three.js model

Three.js renders the interactive character at the centre of the Future You experience, providing a visual focus as users explore milestones.

### GSAP animations

GSAP animates interface transitions and timeline changes to make the experience responsive and easier to follow. It handles presentation, not the underlying calculations.

## Screenshots

### Personalized future-self letter

<img width="820" height="853" alt="download" src="https://github.com/user-attachments/assets/8d17f4e4-3047-4535-9729-2bef9ee1ec8c" />

### Future You timeline

<img width="1615" height="835" alt="Future You timeline" src="https://github.com/user-attachments/assets/b73e6422-9a41-4643-be35-f5d3f6151015" />

### Tracker heatmap and progress

<img width="1677" height="647" alt="Tracker heatmap and progress" src="https://github.com/user-attachments/assets/69d58aca-54e2-437f-ae25-10e5d110bb2f" />

## Technology

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **AI:** OpenRouter API for insights, scenario summaries, and letters
- **3D rendering:** Three.js
- **Animation:** GSAP

## Important note

STACKED provides habit-tracking tools and AI reflections for exploration and motivation. Scenarios depend on available profile and check-in data; they are not guaranteed predictions, medical advice, or a substitute for professional guidance.
