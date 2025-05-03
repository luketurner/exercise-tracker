# Manual

<div class="notification is-warning is-light">

Set is a **side project**, offered with no guarantees it will continue to work.

Don't store data in Set that you don't want to lose (or at least take advantage of the export functionality to make regular backups).

</div>

You've stumbled upon the manual for **Set** (backronym for Simple Exercise Tracker) -- a free, open-source, and mobile-friendly Web app for tracking exercises over time. Using Set is a three-step process:

1. Log in with your Github account (shares your name and email with Set).
2. Create the exercises you want to track in the [Manage Exercises](/exercises) page.
3. Log your exercises in the [Today](/today) page.

Exercises can have parameters, which are used to record values associated with the exercise, like weight, distance, duration, etc. You can have more than one parameter per exercise.

Set supports the following types of parameters:

| Parameter name                           | Units           | Description                                              |
| ---------------------------------------- | --------------- | -------------------------------------------------------- |
| # Reps                                   | Number          | Number of times the exercise was performed in the set.   |
| <i class="ti ti-weight"></i> Weight      | lb/kg           | Amount of weight used for the set.                       |
| <i class="ti ti-lifebuoy"></i> Assisted  | lb/kg           | Amount of assistance (negative weight) used for the set. |
| <i class="ti ti-ruler-3"></i> Distance   | mile/km         | The distance associated with the set.                    |
| <i class="ti ti-clock"></i> Duration     | min             | The duration of the set.                                 |
| <i class="ti ti-activity"></i> Intensity | Low/Medium/High | The general intensity of the set.                        |

# Managing exercises

The manage exercises page can be used to create, adjust, or delete exercises.

<div class="notification is-danger is-light">

Note that deleting an exercise will permanently delete all historical data associated with that exercise as well. Deleting an exercise cannot be undone.

</div>

You can change the parameters associated for an exercise at any time -- historical data for that exercise will include an empty value for any parameters added after the data was recorded.

## <i class="ti ti-chart-line"></i> Historical data view

Next to each exercise in the list is a <i class="ti ti-chart-line"></i> button to view historical data for a given exercise. The page includes:

1. Interactive charts that illustrate the change over time for each of the exercise's parameters.
2. A table of the data for all the exercise's past sets.

By default, this page shows you the last year of data, but you can adjust the lookback window (including using "all time" lookback to see all your data at once.)

# Today / Logging page

The Today page is used to log new sets for your exercises. You add sets for the exercises you want to log, then fill out the parameter values (e.g. reps, weight, etc.) for each set.

Changes made to sets are saved automatically. The order of the sets can be adjusted with drag and drop.

If you forgot to log some data for an earlier day, you can click the date in the Today page to log data for a different day.

# Units

You can configure what units the app uses in the [Settings](/settings) page. There are two types of units:

- Weight units (pounds vs. kilograms)
- Distance units (miles vs. kilometers)

The default units are pounds and miles. When you switch units, any historical data is automatically converted to the new unit.

# Managing user data

In the [Settings](/settings) page, you can export and/or delete your user data.

<div class="notification is-danger is-light">

Note that deleting your data is permanent and cannot be undone.

</div>

Exported data includes:

- User settings (units, etc.)
- Exercise metadata
- All the logged sets for all your exercises.
