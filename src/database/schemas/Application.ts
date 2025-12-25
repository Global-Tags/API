import { HydratedDocument, model, Schema } from "mongoose";

export enum ApplicationState {
    Pending = 'pending',
    Approved = 'approved',
    Rejected = 'rejected',
    Withdrawn = 'withdrawn'
}

export enum ApplicationType {
    Moderation = 'moderation',
    Translation = 'translation',
    Development = 'development',
    Partnership = 'partnership'
}

interface IApplication {
    /**
     * Unique identifier for the application
     */
    id: string;
    /**
     * The UUID of the applicant
     */
    applicant: string;
    /**
     * The application type
     */
    type: ApplicationType;
    /**
     * The application status
     */
    status: ApplicationState;
    /**
     * The answers provided by the applicant
     */
    answers: [{
        /**
         * The question being answered
         */
        question: string;
        /**
         * The answer provided by the applicant
         */
        answer: string;
    }];
    /**
     * The review details for the application
     */
    review: {
        /**
         * The staff member who reviewed the application
         */
        reviewer: string | null;
        /**
         * The timestamp of the review
         */
        timestamp: Date | null;
    };
    /**
     * The timestamp when the application was submitted
     */
    submitted_at: Date;

    /**
     * Adds a review to the application
     * @param reviewer The uuid of the reviewer
     * @param status The new status of the application
     */
    updateStatus(reviewer: string, status: ApplicationState): void;
}

const ApplicationSchema = new Schema<IApplication>({
    id: {
        type: String,
        required: true
    },
    applicant: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ApplicationType,
        required: true
    },
    status: {
        type: String,
        enum: ApplicationState,
        required: true
    },
    answers: [{
        question: {
            type: String,
            required: true
        },
        answer: {
            type: String,
            required: true
        }
    }],
    review: {
        reviewer: {
            type: String,
            default: null
        },
        timestamp: {
            type: Date,
            default: null
        }
    },
    submitted_at: {
        type: Date,
        required: true
    }
}, {
    methods: {
        updateStatus(reviewer: string, status: ApplicationState): void {
            this.status = status;
            this.review.reviewer = status !== ApplicationState.Pending ? reviewer : null;
            this.review.timestamp = status !== ApplicationState.Pending ? new Date() : null;
        }
    }
});

export const Application = model<IApplication>('Application', ApplicationSchema);
export type ApplicationDocument = HydratedDocument<IApplication>;